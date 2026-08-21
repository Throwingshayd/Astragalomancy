/**
 * SoundManager — SFX + dual-bed run soundtrack (game/public/ART/Music/)
 *
 * Base bed: preexisting Phi shuffle (always on, 80% gain).
 * Top bed: layered tracks over that. Both decks run the whole session — the
 * shop and pack views do not swap the soundtrack.
 */
/* global MUSIC_BASE_POOL, MUSIC_LAYER_POOL, MUSIC_TRACKS, SeededRNG, Logger */

/** Slight slowdown (was 0.606 Balatro); higher = clearer, less mud */
const MUSIC_BASE_PLAYBACK_RATE = 0.8;
const MUSIC_RUN_RATE_SPREAD = 0.03;
const MUSIC_PLAY_RATE_JITTER = 0.015;

/** Under bed vs accompaniment */
const MUSIC_BASE_TRACK_GAIN = 0.8;
const MUSIC_LAYER_TRACK_GAIN = 1;

/** Dry/wet mix for music convolver */
const MUSIC_REVERB_DRY = 0.95;
const MUSIC_REVERB_WET = 0.05;

const MUSIC_PRE_LP_HZ = 4800;
const MUSIC_PRE_LP_Q = 0.28;

const MUSIC_MASTER_LP_HZ = 4200;
const MUSIC_MASTER_LP_Q = 0.28;
const MUSIC_MASTER_BODY_HZ = 400;
const MUSIC_MASTER_BODY_DB = 0.8;
const MUSIC_MASTER_BODY_Q = 1;

/** musicPool.js failed to load — run silent rather than block on a soundtrack. */
const FALLBACK_BASE_POOL = [];
const FALLBACK_LAYER_POOL = [];

class SoundManager {
    constructor() {
        this._sfxBaseCandidates = ['sounds/', 'public/sounds/'];
        this._musicPrefixCandidates = ['', 'public/'];
        this._resolvedSfxBase = null;
        this._resolvedMusicPrefix = null;
        this.musicVolume = 0.6;
        this.sfxVolume = 0.8;
        this.audioContext = null;
        this.musicGain = null;
        this.sfxGain = null;
        this._initialized = false;
        this._musicPlaying = false;
        /** @deprecated Prefer base/layer sources — kept for any external peek */
        this.musicSource = null;
        this._musicSourceGain = null;
        this._reverbIR = null;
        this._musicMasterIn = null;

        this._baseSource = null;
        this._baseGain = null;
        this._layerSource = null;
        this._layerGain = null;
        this._baseFailCount = 0;
        this._layerFailCount = 0;

        this._deckSeed = null;
        this._musicRng = null;
        this._baseDeck = [];
        this._layerDeck = [];
        this._lastBaseId = null;
        this._lastLayerId = null;
        this._runPlaybackRate = MUSIC_BASE_PLAYBACK_RATE;
    }

    _tracks() {
        return (typeof MUSIC_TRACKS !== 'undefined' && MUSIC_TRACKS) || {};
    }

    _basePool() {
        if (typeof MUSIC_BASE_POOL !== 'undefined' && MUSIC_BASE_POOL?.length) {
            return [...MUSIC_BASE_POOL];
        }
        return [...FALLBACK_BASE_POOL];
    }

    _layerPool() {
        if (typeof MUSIC_LAYER_POOL !== 'undefined' && MUSIC_LAYER_POOL?.length) {
            return [...MUSIC_LAYER_POOL];
        }
        return [...FALLBACK_LAYER_POOL];
    }

    /**
     * Build shuffled decks for this run (deterministic from seed + ':music' salt).
     */
    initRunDeck(seed) {
        const s = String(seed || 'NEWRUN');
        if (this._deckSeed === s) return;
        this.stopMusic();
        this._deckSeed = s;
        this._musicRng = new SeededRNG(`${s}:music`);
        this._runPlaybackRate = MUSIC_BASE_PLAYBACK_RATE
            + (this._musicRng.random() - 0.5) * 2 * MUSIC_RUN_RATE_SPREAD;
        this._lastBaseId = null;
        this._lastLayerId = null;
        this._reshuffleBaseDeck();
        this._reshuffleLayerDeck();
        if (typeof Logger !== 'undefined') {
            Logger.info(
                'SoundManager: dual-bed deck init',
                s,
                'base', this._baseDeck.join(' → '),
                'layer', this._layerDeck.join(' → ')
            );
        }
    }

    _reshuffleAvoidingLast(pool, lastId) {
        let order = this._musicRng.shuffle(pool);
        if (lastId && order.length > 1 && order[order.length - 1] === lastId) {
            const j = Math.floor(this._musicRng.random() * (order.length - 1));
            [order[order.length - 1], order[j]] = [order[j], order[order.length - 1]];
        }
        return order;
    }

    _reshuffleBaseDeck() {
        this._baseDeck = this._reshuffleAvoidingLast(this._basePool(), this._lastBaseId);
    }

    _reshuffleLayerDeck() {
        const pool = this._layerPool();
        this._layerDeck = pool.length
            ? this._reshuffleAvoidingLast(pool, this._lastLayerId)
            : [];
    }

    _pickNextBaseId() {
        if (!this._baseDeck.length) this._reshuffleBaseDeck();
        const id = this._baseDeck.pop();
        this._lastBaseId = id;
        return id;
    }

    _pickNextLayerId() {
        if (!this._layerDeck.length) this._reshuffleLayerDeck();
        if (!this._layerDeck.length) return null;
        const id = this._layerDeck.pop();
        this._lastLayerId = id;
        return id;
    }

    _getPlaybackRate() {
        const base = this._runPlaybackRate ?? MUSIC_BASE_PLAYBACK_RATE;
        const rng = this._musicRng?.random?.bind(this._musicRng) ?? Math.random;
        const jitter = (rng() - 0.5) * 2 * MUSIC_PLAY_RATE_JITTER;
        return Math.max(0.74, Math.min(0.92, base + jitter));
    }

    ensureReady() {
        if (this._initialized) return;
        this._initialized = true;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.sfxGain.gain.value = this.sfxVolume;
            this._buildMusicMasterChain();
            this.sfxGain.connect(this.audioContext.destination);
            this._reverbIR = this._createOpenStoaIR();
            if (typeof Logger !== 'undefined') Logger.info('SoundManager initialized');
        } catch (e) {
            if (typeof Logger !== 'undefined') Logger.warn('SoundManager: Audio unavailable', e);
        }
    }

    _buildMusicMasterChain() {
        if (this._musicMasterIn || !this.audioContext) return;
        const ac = this.audioContext;
        this._musicMasterIn = ac.createGain();
        this._musicMasterIn.gain.value = 1;

        const aquaticLP = ac.createBiquadFilter();
        aquaticLP.type = 'lowpass';
        aquaticLP.frequency.value = MUSIC_MASTER_LP_HZ;
        aquaticLP.Q.value = MUSIC_MASTER_LP_Q;

        const bodyPeak = ac.createBiquadFilter();
        bodyPeak.type = 'peaking';
        bodyPeak.frequency.value = MUSIC_MASTER_BODY_HZ;
        bodyPeak.Q.value = MUSIC_MASTER_BODY_Q;
        bodyPeak.gain.value = MUSIC_MASTER_BODY_DB;

        const airShelf = ac.createBiquadFilter();
        airShelf.type = 'highshelf';
        airShelf.frequency.value = 5200;
        airShelf.gain.value = -1.2;
        airShelf.Q.value = 0.7;

        const glue = ac.createDynamicsCompressor();
        glue.threshold.value = -26;
        glue.knee.value = 22;
        glue.ratio.value = 2.2;
        glue.attack.value = 0.045;
        glue.release.value = 0.38;

        this._musicMasterIn.connect(aquaticLP);
        aquaticLP.connect(bodyPeak);
        bodyPeak.connect(airShelf);
        airShelf.connect(glue);
        glue.connect(this.musicGain);
        this.musicGain.connect(ac.destination);
        this.musicFxRevision = 6;
        if (typeof Logger !== 'undefined') {
            Logger.info('SoundManager: music bus v' + this.musicFxRevision + ' (dual-bed)');
        }
    }

    _createOpenStoaIR() {
        if (!this.audioContext) return null;
        const sr = this.audioContext.sampleRate;
        const duration = 2.6;
        const len = Math.floor(sr * duration);
        const ir = this.audioContext.createBuffer(2, len, sr);
        const L = ir.getChannelData(0);
        const R = ir.getChannelData(1);

        const earlyDelays = [0.012, 0.028, 0.047, 0.068, 0.091, 0.118];
        const earlyGain = 0.2;
        for (const delay of earlyDelays) {
            const idx = Math.floor(delay * sr);
            if (idx < len) {
                L[idx] = (Math.random() * 2 - 1) * earlyGain;
                R[idx] = (Math.random() * 2 - 1) * earlyGain * 0.8;
            }
        }

        const decay = 2.0;
        const tailLevel = 0.17;
        for (let i = 0; i < len; i++) {
            const t = i / len;
            const d = Math.pow(1 - t, decay);
            const rolloff = 1 - t * 0.45;
            L[i] = (L[i] || 0) + (Math.random() * 2 - 1) * d * rolloff * tailLevel;
            R[i] = (R[i] || 0) + (Math.random() * 2 - 1) * d * rolloff * tailLevel;
        }
        return ir;
    }

    _seededStartOffset(buffer) {
        const dur = buffer.duration;
        if (dur < 5) return 0;
        const maxOffset = dur * 0.5;
        const rng = this._musicRng?.random?.bind(this._musicRng) ?? Math.random;
        return rng() * maxOffset;
    }

    _getSfxPaths(soundCode) {
        if (this._resolvedSfxBase) return [`${this._resolvedSfxBase}${soundCode}.ogg`];
        return this._sfxBaseCandidates.map(base => `${base}${soundCode}.ogg`);
    }

    _getMusicPaths(trackPath) {
        if (this._resolvedMusicPrefix != null) return [`${this._resolvedMusicPrefix}${trackPath}`];
        return this._musicPrefixCandidates.map(prefix => `${prefix}${trackPath}`);
    }

    async _fetchFirstAudioBuffer(paths) {
        let lastError = null;
        for (const path of paths) {
            try {
                const res = await fetch(path);
                if (!res.ok) {
                    lastError = new Error(`HTTP ${res.status} for ${path}`);
                    continue;
                }

                if (path.includes('ART/Music/')) {
                    this._resolvedMusicPrefix = path.startsWith('public/') ? 'public/' : '';
                } else if (path.endsWith('.ogg')) {
                    const slash = path.lastIndexOf('/') + 1;
                    this._resolvedSfxBase = path.slice(0, slash);
                }

                return await res.arrayBuffer();
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError || new Error('Audio fetch failed');
    }

    play(soundCode, options = {}) {
        this.ensureReady();
        if (!this.audioContext) return;
        const pitch = options.pitch ?? 1;
        const volume = options.volume ?? 1;
        const paths = this._getSfxPaths(soundCode);
        this._fetchFirstAudioBuffer(paths)
            .then(buf => this.audioContext.decodeAudioData(buf))
            .then(buffer => {
                const src = this.audioContext.createBufferSource();
                src.buffer = buffer;
                src.playbackRate.value = pitch;
                const gain = this.audioContext.createGain();
                gain.gain.value = volume;
                src.connect(gain);
                gain.connect(this.sfxGain);
                src.start(0);
            })
            .catch(() => { /* ignore load errors */ });
    }

    async startMusic() {
        this.ensureReady();
        if (!this.audioContext || this._musicPlaying) return;
        if (this.audioContext.state === 'suspended') await this.audioContext.resume();
        if (!this._deckSeed) this.initRunDeck('NEWRUN');
        this._musicPlaying = true;
        this._playNextBase();
        this._playNextLayer();
    }

    _stopSource(kind) {
        const srcKey = kind === 'base' ? '_baseSource' : '_layerSource';
        const gainKey = kind === 'base' ? '_baseGain' : '_layerGain';
        const src = this[srcKey];
        if (src) {
            try {
                src.onended = null;
                src.stop();
            } catch (_) { /* ignore */ }
            this[srcKey] = null;
        }
        this[gainKey] = null;
        if (kind === 'layer') {
            this.musicSource = null;
            this._musicSourceGain = null;
        }
    }

    async _loadTrackBuffer(trackId) {
        const tracks = this._tracks();
        const path = tracks[trackId];
        if (!path) throw new Error(`Unknown music track: ${trackId}`);
        const candidatePaths = this._getMusicPaths(path);
        const buf = await this._fetchFirstAudioBuffer(candidatePaths);
        return this.audioContext.decodeAudioData(buf);
    }

    _connectMusicSource(smoothing, srcGain) {
        const dryGain = this.audioContext.createGain();
        const wetGain = this.audioContext.createGain();
        dryGain.gain.value = MUSIC_REVERB_DRY;
        wetGain.gain.value = MUSIC_REVERB_WET;
        dryGain.connect(srcGain);
        wetGain.connect(srcGain);
        if (this._reverbIR) {
            const conv = this.audioContext.createConvolver();
            conv.buffer = this._reverbIR;
            smoothing.connect(conv);
            conv.connect(wetGain);
        } else {
            smoothing.connect(wetGain);
        }
        smoothing.connect(dryGain);
    }

    async _playNextBase() {
        if (!this._musicPlaying || !this.audioContext) return;
        const trackId = this._pickNextBaseId();
        await this._playOnBed('base', trackId, {
            gain: MUSIC_BASE_TRACK_GAIN,
            rate: this._getPlaybackRate(),
        });
    }

    async _playNextLayer() {
        if (!this._musicPlaying || !this.audioContext) return;
        const trackId = this._pickNextLayerId();
        if (!trackId) return;
        await this._playOnBed('layer', trackId, {
            gain: MUSIC_LAYER_TRACK_GAIN,
            rate: this._getPlaybackRate(),
        });
    }

    /**
     * @param {'base'|'layer'} bed
     * @param {string} trackId
     * @param {{ gain?: number, rate?: number }} [opts]
     */
    async _playOnBed(bed, trackId, opts = {}) {
        if (!this.audioContext || !trackId) return;
        if (!this._musicPlaying) return;

        const path = this._tracks()[trackId];
        try {
            const audioBuffer = await this._loadTrackBuffer(trackId);
            if (!this._musicPlaying) return;

            if (bed === 'base') this._baseFailCount = 0;
            else this._layerFailCount = 0;

            this._stopSource(bed);

            const src = this.audioContext.createBufferSource();
            src.buffer = audioBuffer;
            src.playbackRate.value = opts.rate ?? this._getPlaybackRate();

            const smoothing = this.audioContext.createBiquadFilter();
            smoothing.type = 'lowpass';
            smoothing.frequency.value = MUSIC_PRE_LP_HZ;
            smoothing.Q.value = MUSIC_PRE_LP_Q;
            src.connect(smoothing);

            const srcGain = this.audioContext.createGain();
            srcGain.gain.value = opts.gain ?? (bed === 'base' ? MUSIC_BASE_TRACK_GAIN : MUSIC_LAYER_TRACK_GAIN);
            if (this._musicMasterIn) srcGain.connect(this._musicMasterIn);
            else srcGain.connect(this.musicGain);
            this._connectMusicSource(smoothing, srcGain);

            src.onended = () => {
                if (!this._musicPlaying) return;
                if (bed === 'base') this._playNextBase();
                else this._playNextLayer();
            };

            src.start(0, this._seededStartOffset(audioBuffer));

            if (bed === 'base') {
                this._baseSource = src;
                this._baseGain = srcGain;
            } else {
                this._layerSource = src;
                this._layerGain = srcGain;
                this.musicSource = src;
                this._musicSourceGain = srcGain;
            }
        } catch (e) {
            if (bed === 'base') {
                this._baseFailCount = (this._baseFailCount || 0) + 1;
                if (typeof Logger !== 'undefined') Logger.warn('Base music load failed:', trackId, path, e);
                if (this._baseFailCount < 8) setTimeout(() => this._playNextBase(), 1000);
            } else {
                this._layerFailCount = (this._layerFailCount || 0) + 1;
                if (typeof Logger !== 'undefined') Logger.warn('Layer music load failed:', trackId, path, e);
                if (this._layerFailCount < 8) setTimeout(() => this._playNextLayer(), 1000);
            }
        }
    }

    stopMusic() {
        this._musicPlaying = false;
        this._stopSource('base');
        this._stopSource('layer');
    }

    setMusicVolume(v) {
        this.musicVolume = Math.max(0, Math.min(1, v));
        if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    }

    setSfxVolume(v) {
        this.sfxVolume = Math.max(0, Math.min(1, v));
        if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    }

    startOnInteraction() {
        this.ensureReady();
        if (!this._musicPlaying && this.audioContext) this.startMusic();
    }
}

window.soundManager = new SoundManager();
