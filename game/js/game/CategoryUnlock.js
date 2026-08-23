/**
 * Roll-gated pantheon unlocks. Five of a kind still grows the dice (7/8/9)
 * and grants The Sixth Astragalus (not a shop roll). Heureka (six of a kind)
 * and Extra Long Straight (six-run) appear when rolled.
 */
/* exported CategoryUnlock */
/* global SCORING_THRESHOLDS, UNLOCKABLE_SCORE_ROWS, HandEvaluator, ArtifactDice, CardData */

const CategoryUnlock = {
    HIGH_FACE_ORDER: ['Sevens', 'Eights', 'Nines'],

    gatedRows() {
        return typeof UNLOCKABLE_SCORE_ROWS !== 'undefined'
            ? UNLOCKABLE_SCORE_ROWS
            : ['Sevens', 'Eights', 'Nines', 'Heureka', 'Extra Long Straight'];
    },

    isLocked(state, category) {
        if (!this.gatedRows().includes(category)) return false;
        return !state?.unlockedCategories?.[category];
    },

    facesFrom(engine) {
        return (engine.state.dice || []).map((d) => engine.getDieFaceValue(d, 1));
    },

    faceCounts(faces) {
        return faces.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});
    },

    consecutiveRun(faces) {
        const unique = [...new Set(faces)].sort((a, b) => a - b);
        if (typeof HandEvaluator !== 'undefined') return HandEvaluator._maxConsecutiveRun(unique);
        if (!unique.length) return 0;
        let run = 1;
        let maxRun = 1;
        for (let i = 1; i < unique.length; i++) {
            if (unique[i] === unique[i - 1] + 1) {
                run += 1;
                if (run > maxRun) maxRun = run;
            } else {
                run = 1;
            }
        }
        return maxRun;
    },

    onRoll(engine) {
        if (!engine?.state) return;
        const faces = this.facesFrom(engine);
        const counts = this.faceCounts(faces);
        this.previewBonusFiveOfAKind(engine, counts);
    },

    previewBonusFiveOfAKind(engine, counts) {
        if (!Object.values(counts).some((c) => c >= 5)) return;
        engine.state.yahtzeesRolledThisRun = (engine.state.yahtzeesRolledThisRun || 0) + 1;
        engine.state.bonusYahtzees = Math.min(3, engine.state.yahtzeesRolledThisRun - 1);
    },

    sixthAstragalusDef() {
        const fromData = (typeof CardData !== 'undefined' && CardData.artifacts?.sixth_astragalus?.base)
            ? CardData.artifacts.sixth_astragalus.base
            : null;
        return fromData || {
            id: (typeof ArtifactDice !== 'undefined' && ArtifactDice.ID) || 'artifact_sixth_astragalus',
            name: 'The Sixth Astragalus',
            effect: '+1 die. All of its faces start as 1s. Opens from The Jar (dash 4).',
            rarity: 'artifact',
        };
    },

    grantSixthAstragalus(engine) {
        const state = engine?.state;
        if (!state || typeof ArtifactDice === 'undefined') return false;
        if (ArtifactDice.owns(state, ArtifactDice.ID)) return false;
        if (!Array.isArray(state.artifacts)) state.artifacts = [];
        state.artifacts.push({ ...this.sixthAstragalusDef() });
        ArtifactDice.ensure(state);
        engine.applyArtifactEffects?.();
        engine.globalData?.unlockItem?.('artifacts', ArtifactDice.ID);
        engine.showMessage?.('The Sixth Astragalus — a spare knucklebone joins the cast.', 4000);
        if (engine.domReady) engine.updateAllUI?.();
        return true;
    },

    unlockOnRoll(engine, category, message) {
        const state = engine.state;
        if (!state.unlockedCategories) state.unlockedCategories = {};
        if (state.unlockedCategories[category]) return false;
        state.unlockedCategories[category] = true;
        engine.updateMaxTurns?.();
        engine.showMessage?.(message, 4000);
        if (engine.domReady) engine.updateAllUI?.();
        return true;
    },

    previewHeureka() {
        return false;
    },

    previewExtraLongStraight() {
        return false;
    },

    unlockHighFaces(engine) {
        const yahtzeeCount = engine.state.bonusYahtzees;
        for (let i = 0; i < yahtzeeCount && i < this.HIGH_FACE_ORDER.length; i++) {
            const category = this.HIGH_FACE_ORDER[i];
            if (engine.state.unlockedCategories[category]) continue;
            engine.state.unlockedCategories[category] = true;
            engine.updateMaxTurns?.();
            engine.showMessage?.(`${category} unlocked! Dice upgraded to ${7 + i}-sided!`, 4000);
            if (engine.domReady) engine.updateAllUI?.();
        }
    },
};

if (typeof window !== 'undefined') window.CategoryUnlock = CategoryUnlock;
