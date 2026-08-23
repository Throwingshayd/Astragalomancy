/**
 * The Jar is a latch, not a hand. 3-of-each face (Ones–Sixes) fills a dash
 * and opens the next gift. Kept out of GameEngine.
 * @module PandoraLatch
 */

/* exported PandoraLatch */
/* global CategoryUnlock, ArtifactDice, CardData */

const PandoraLatch = {
    FACE_ROWS: ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes'],
    FACE_OF: { Ones: 1, Twos: 2, Threes: 3, Fours: 4, Fives: 5, Sixes: 6 },

    GIFTS: [
        { kind: 'row', category: 'Sevens', line: 'The Pleiades announce themselves to the pantheon.' },
        { kind: 'row', category: 'Eights', line: 'Poseidon claims his lot. The sea is on the card.' },
        { kind: 'row', category: 'Nines', line: "Mnemosyne's daughters take their seats. The nine will sing." },
        { kind: 'sixth', line: 'A sixth knucklebone is laid on the table.' },
        { kind: 'row', category: 'Extra Long Straight', line: 'Iris spans the houses. The full arc is open.' },
        { kind: 'row', category: 'Heureka', line: "The king's pile is found. Six the same will stand." },
        { kind: 'seventh', line: 'The seventh bone will not sit still.' },
    ],

    emptyMarks() {
        return { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };
    },

    ensure(state) {
        if (!state) return state;
        if (!state.jarFaceMarks || typeof state.jarFaceMarks !== 'object') {
            state.jarFaceMarks = this.emptyMarks();
        }
        if (typeof state.jarDashes !== 'number') state.jarDashes = 0;
        if (!Array.isArray(state.pendingJarLines)) state.pendingJarLines = [];
        return state;
    },

    dashCount(state) {
        return this.ensure(state).jarDashes || 0;
    },

    facesOf(engine) {
        return (engine?.state?.dice || []).map((d) => {
            if (typeof engine.getDieFaceValue === 'function') return engine.getDieFaceValue(d, 1);
            if (typeof d.getEffectiveFace === 'function') return d.getEffectiveFace();
            return d.face ?? d.currentFace ?? 0;
        });
    },

    afterScore(engine, category) {
        if (!engine?.state || !category) return;
        this.ensure(engine.state);
        const face = this.FACE_OF[category];
        if (!face) return;
        const need = face;
        const count = this.facesOf(engine).filter((f) => f === need).length;
        if (count < 3) return;
        if (engine.state.jarFaceMarks[face]) return;
        engine.state.jarFaceMarks[face] = true;
        if (this.FACE_ROWS.every((row) => engine.state.jarFaceMarks[this.FACE_OF[row]])) {
            this.openNextDash(engine);
        }
        if (engine.domReady) engine.updateAllUI?.();
    },

    openNextDash(engine) {
        const state = engine.state;
        if (state.jarDashes >= this.GIFTS.length) return;
        const gift = this.GIFTS[state.jarDashes];
        state.jarDashes += 1;
        state.jarFaceMarks = this.emptyMarks();
        state.pendingJarLines.push(gift.line);
        this.applyGift(engine, gift);
    },

    applyGift(engine, gift) {
        if (gift.kind === 'row' && gift.category) {
            if (!engine.state.unlockedCategories) engine.state.unlockedCategories = {};
            engine.state.unlockedCategories[gift.category] = true;
            engine.updateMaxTurns?.();
            return;
        }
        if (gift.kind === 'sixth' && typeof CategoryUnlock !== 'undefined') {
            CategoryUnlock.grantSixthAstragalus(engine);
            return;
        }
        if (gift.kind === 'seventh') {
            this.grantSeventhAstragalus(engine);
        }
    },

    seventhDef() {
        const fromData = (typeof CardData !== 'undefined' && CardData.artifacts?.sixth_astragalus?.upgraded)
            ? CardData.artifacts.sixth_astragalus.upgraded
            : null;
        return fromData || {
            id: (typeof ArtifactDice !== 'undefined' && ArtifactDice.SEVENTH_ID) || 'artifact_seventh_astragalus',
            name: 'The Seventh Astragalus',
            effect: '+1 die. Its faces start Wild.',
            rarity: 'artifact',
        };
    },

    grantSeventhAstragalus(engine) {
        const state = engine?.state;
        if (!state || typeof ArtifactDice === 'undefined') return false;
        if (ArtifactDice.owns(state, ArtifactDice.SEVENTH_ID)) return false;
        if (!Array.isArray(state.artifacts)) state.artifacts = [];
        state.artifacts.push({ ...this.seventhDef() });
        ArtifactDice.ensure(state);
        engine.applyArtifactEffects?.();
        engine.globalData?.unlockItem?.('artifacts', ArtifactDice.SEVENTH_ID);
        if (engine.domReady) engine.updateAllUI?.();
        return true;
    },

    announceCashout(engine) {
        this.ensure(engine?.state);
        const lines = engine.state.pendingJarLines || [];
        engine.state.pendingJarLines = [];
        lines.forEach((line) => engine.showMessage?.(line, 5000));
        return lines;
    },
};

if (typeof window !== 'undefined') window.PandoraLatch = PandoraLatch;
