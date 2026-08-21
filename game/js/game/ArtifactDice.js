/**
 * Extra dice granted by artifacts (The Sixth Astragalus).
 * Keeps GameEngine from owning count/rehydrate/save rules.
 *
 * @module game/ArtifactDice
 */

/* exported ArtifactDice */
/* global GAME_BALANCE, Die */

const ArtifactDice = {
    ID: 'artifact_sixth_astragalus',
    /** Each astragalus in the family adds its own die, so owning both gives seven. */
    IDS: ['artifact_sixth_astragalus', 'artifact_seventh_astragalus'],

    extraCount(state) {
        return (state?.artifacts || []).filter((a) => a && this.IDS.includes(a.id)).length;
    },

    expectedCount(state) {
        const base = (typeof GAME_BALANCE !== 'undefined' && GAME_BALANCE.STARTING_DICE_COUNT) || 5;
        return base + this.extraCount(state);
    },

    createOnesDie(dieId) {
        const die = new Die(dieId);
        if (typeof die.setAllModifiedFaces === 'function') die.setAllModifiedFaces(1);
        return die;
    },

    syncHeld(state) {
        if (!state) return;
        const n = Array.isArray(state.dice) ? state.dice.length : 0;
        if (!Array.isArray(state.held)) state.held = [];
        while (state.held.length < n) state.held.push(false);
        if (state.held.length > n) state.held = state.held.slice(0, n);
    },

    /**
     * Idempotent: pad to expected count with all-1s dice; never blank an existing extra die.
     */
    ensure(state) {
        if (!state || !Array.isArray(state.dice) || typeof Die === 'undefined') {
            this.syncHeld(state);
            return;
        }
        const expected = this.expectedCount(state);
        while (state.dice.length < expected) {
            state.dice.push(this.createOnesDie(state.dice.length + 1));
        }
        this.syncHeld(state);
    },
};

if (typeof window !== 'undefined') window.ArtifactDice = ArtifactDice;
