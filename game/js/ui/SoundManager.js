/**
 * SoundManager — SFX + roguelike run soundtrack (game/public/ART/Music/)
 *
 * Music: seeded deck shuffle per run (MUSIC_POOL in musicPool.js). No stage/event
 * gating. Light slowdown, random entry, stoa reverb (forward playback).
 */
/* global MUSIC_POOL, MUSIC_TRACKS, SeededRNG, Logger */

/** Slight slowdown (was 0.606 Balatro); higher = clearer, less mud */
const MUSIC_BASE_PLAYBACK_RATE = 0.8;
const MUSIC_RUN_RATE_SPREAD = 0.03;
const MUSIC_PLAY_RATE_JITTER = 0.015;

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

const LEGACY_MUSIC_TRACKS = {
    music1: 'ART/Music/lute 1 effects.ogg',
    music2: 'ART/Music/lute 2 w effects.ogg',
    music3: 'ART/Music/lute 3 w effects.ogg',
    music4: 'ART/Music/lute 4 w effects.ogg',
    music5: 'ART/Music/lute 5 w effects.ogg'
};

const FALLBACK_POOL = ['music1', 'music2', 'music3', 'music4', 'music5'];

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
        this.musicSource = null;
        this._musicSourceGain = null;
        this._reverbIR = null;
        this._musicLoadFailCount = 0;
        this._musicMasterIn = null;

        /** Roguelike deck state */
        this._deckSeed = null;
        this._musicRng = null;
        this._deck = [];
        this._lastTrackId = null;
        this._runPlaybackRate = MUSIC_BASE_PLAYBACK_RATE;
    }

    _tracks() {
        return (typeof MUSIC_TRACKS !== 'undefined' && MUSIC_TRACKS) || LEGACY_MUSIC_TRACKS;
    }

    _pool() {
        if (typeof MUSIC_POOL !== 'undefined' && MUSIC_POOL?.length) return [...MUSIC_POOL];
        return [...FALLBACK_POOL];
    }

    /**
     * Build shuffled deck for this run (deterministic from seed + ':music' salt).
     * Call when a new run starts; same seed on continue preserves order if already inited.
     */
    initRunDeck(seed) {
        const s = String(seed || 'NEWRUN');
        if (this._deckSeed === s) return;
        this.stopMusic();
        this._deckSeed = s;
        this._musicRng = new SeededRNG(`${s}:music`);
        this._runPlaybackRate = MUSIC_BASE_PLAYBACK_RATE
            + (this._musicRng.random() - 0.5) * 2 * MUSIC_RUN_RATE_SPREAD;
        this._lastTrackId = null;
        this._reshuffleDeck();
        if (typeof Logger !== 'undefined') {
            Logger.info('SoundManager: run deck init', s, this._deck.join(' → '));
        }
    }

    _reshuffleDeck() {
        let order = this._musicRng.shuffle(this._pool());
        if (this._lastTrackId && order.length > 1 && order[order.length - 1] === this._lastTrackId) {
            const j = Math.floor(this._musicRng.random() * (order.length - 1));
            [order[order.length - 1], order[j]] = [order[j], order[order.length - 1]];
        }
        this._deck = order;
    }

    _pickNextTrackId() {
        if (!this._deck.length) this._reshuffleDeck();
        const id = this._deck.pop();
        this._lastTrackId = id;
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
        this.musicFxRevision = 5;
        if (typeof Logger !== 'undefined') {
            Logger.info('SoundManager: music bus v' + this.musicFxRevision + ' (deck shuffle, brighter bus)');
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

    /** Seeded random entry — skip intros, stay out of outros */
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
        this._playNextFromDeck();
    }

    /** Kept for shop/pack callers — deck is not gated by context. */
    setMusicContext(_context) {
        /* no-op: roguelike deck plays through regardless of UI mode */
    }

    async _loadTrackBuffer(trackId) {
        const tracks = this._tracks();
        const path = tracks[trackId] || tracks.music1 || LEGACY_MUSIC_TRACKS.music1;
        const candidatePaths = this._getMusicPaths(path);
        const buf = await this._fetchFirstAudioBuffer(candidatePaths);
        return this.audioContext.decodeAudioData(buf);
    }

    _connectMusicSource(src, smoothing, srcGain) {
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

    async _playNextFromDeck() {
        if (!this._musicPlaying || !this.audioContext) return;
        const trackId = this._pickNextTrackId();
        await this._playTrack(trackId);
    }

    async _playTrack(trackId) {
        if (!this._musicPlaying || !this.audioContext) return;
        const tracks = this._tracks();
        const path = tracks[trackId] || tracks.music1;
        try {
            const audioBuffer = await this._loadTrackBuffer(trackId);
            this._musicLoadFailCount = 0;
            const src = this.audioContext.createBufferSource();
            src.buffer = audioBuffer;
            src.loop = false;
            src.playbackRate.value = this._getPlaybackRate();
            const smoothing = this.audioContext.createBiquadFilter();
            smoothing.type = 'lowpass';
            smoothing.frequency.value = MUSIC_PRE_LP_HZ;
            smoothing.Q.value = MUSIC_PRE_LP_Q;
            src.connect(smoothing);
            const srcGain = this.audioContext.createGain();
            srcGain.gain.value = 1;
            if (this._musicMasterIn) srcGain.connect(this._musicMasterIn);
            else srcGain.connect(this.musicGain);
            this._connectMusicSource(src, smoothing, srcGain);
            const startOffset = this._seededStartOffset(audioBuffer);
            src.onended = () => this._playNextFromDeck();
            src.start(0, startOffset);
            this.musicSource = src;
            this._musicSourceGain = srcGain;
        } catch (e) {
            this._musicLoadFailCount = (this._musicLoadFailCount || 0) + 1;
            if (typeof Logger !== 'undefined') Logger.warn('Music load failed:', trackId, path, e);
            if (this._musicLoadFailCount < 8) {
                setTimeout(() => this._playNextFromDeck(), 1000);
            }
        }
    }

    stopMusic() {
        this._musicPlaying = false;
        if (this.musicSource) {
            try { this.musicSource.stop(); } catch (_) { /* ignore */ }
            this.musicSource = null;
        }
        this._musicSourceGain = null;
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
