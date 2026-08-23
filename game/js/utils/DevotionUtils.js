/* global PlayerTitles */
/**
 * Pantheon devotion — re-scores, Roman marks, consecration overrides.
 * @module DevotionUtils
 */

const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const DevotionUtils = {
    toRoman(n) {
        const v = Math.max(0, Math.min(10, Math.floor(Number(n) || 0)));
        return ROMAN_NUMERALS[v] || String(v);
    },

    ensureState(state) {
        if (!state.pantheonDevotion) state.pantheonDevotion = {};
        if (!state.devotionCapacity) state.devotionCapacity = {};
        if (!state.categoryGodBinding) state.categoryGodBinding = {};
        if (!state.categoryScoringOverride) state.categoryScoringOverride = {};
    },

    getMarks(state, category) {
        const m = state?.pantheonDevotion?.[category]?.marks;
        if (m != null) return m;
        return state?.scorecard?.[category] !== undefined ? 1 : 0;
    },

    getCapacity(state, category) {
        this.ensureState(state);
        let cap = state.devotionCapacity[category];
        if (cap == null) {
            cap = typeof DEVOTION_BASE_CAPACITY !== 'undefined' ? DEVOTION_BASE_CAPACITY : 1;
        }
        return cap;
    },

    addCapacity(state, category, amount = 1) {
        this.ensureState(state);
        const cur = this.getCapacity(state, category);
        state.devotionCapacity[category] = cur + amount;
    },

    canScoreCategory(state, category) {
        if (!category || !state) return false;
        const gated = typeof UNLOCKABLE_SCORE_ROWS !== 'undefined'
            ? UNLOCKABLE_SCORE_ROWS
            : ['Sevens', 'Eights', 'Nines', 'Heureka', 'Extra Long Straight'];
        if (gated.includes(category) && !state.unlockedCategories?.[category]) {
            return false;
        }
        return this.getMarks(state, category) < this.getCapacity(state, category);
    },

    hasBeenScored(state, category) {
        return this.getMarks(state, category) > 0
            || state?.scorecard?.[category] !== undefined;
    },

    applyPantheonScore(state, category, finalScore) {
        if (!category || !state) return;
        this.ensureState(state);
        const dev = state.pantheonDevotion[category] || { marks: 0 };
        dev.marks = (dev.marks || 0) + 1;
        state.pantheonDevotion[category] = dev;
        const prev = state.scorecard[category];
        const add = Number(finalScore) || 0;
        state.scorecard[category] = (typeof prev === 'number' ? prev : 0) + add;
    },

    resetTrialDevotion(state) {
        if (!state) return;
        state.pantheonDevotion = {};
        state.devotionCapacity = {};
        state.categoryGodBinding = {};
        state.categoryScoringOverride = {};
    },

    /** Display name for a pantheon slot (consecrated slots show the worship hand). */
    getDisplayCategory(state, slotCategory) {
        const evalCat = this.getEvalCategory(state, slotCategory);
        if (typeof PlayerTitles !== 'undefined') return PlayerTitles.display(evalCat);
        return evalCat === 'Yahtzee' ? 'The House' : evalCat;
    },

    isConsecratedSlot(state, slotCategory) {
        this.ensureState(state);
        const override = state.categoryScoringOverride[slotCategory];
        return !!override && override !== slotCategory;
    },

    /** Count pantheon slots currently offering the same hand (e.g. two Full Houses). */
    countSlotsForHand(state, handCategory) {
        if (!state || !handCategory) return 0;
        this.ensureState(state);
        const slots = [
            'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
            'Three of a Kind', 'Small Straight', 'Full House', 'Four of a Kind',
            'Large Straight', 'Yahtzee', 'Chance',
        ];
        if (state.unlockedCategories?.Sevens) slots.push('Sevens');
        if (state.unlockedCategories?.Eights) slots.push('Eights');
        if (state.unlockedCategories?.Nines) slots.push('Nines');
        if (state.unlockedCategories?.Heureka) slots.push('Heureka');
        if (state.unlockedCategories?.['Extra Long Straight']) slots.push('Extra Long Straight');
        let n = 0;
        for (const slot of slots) {
            if (this.getEvalCategory(state, slot) === handCategory) n += 1;
        }
        return n;
    },

    getGodForCategory(state, category) {
        this.ensureState(state);
        const bound = state.categoryGodBinding[category];
        if (bound) return bound;
        return typeof GodUtils !== 'undefined' ? GodUtils.getGodForCategory(category) : null;
    },

    /** Hand category used when evaluating dice (consecration override). */
    getEvalCategory(state, pantheonCategory) {
        this.ensureState(state);
        return state.categoryScoringOverride[pantheonCategory] || pantheonCategory;
    },

    /** Pip / worship table row for a pantheon slot (follows bound god). */
    getPipCategory(state, pantheonCategory) {
        const god = this.getGodForCategory(state, pantheonCategory);
        if (god && typeof GodUtils !== 'undefined') {
            return GodUtils.getCategory(god) || pantheonCategory;
        }
        return pantheonCategory;
    },

    getRomanMark(state, category) {
        const marks = this.getMarks(state, category);
        return marks > 0 ? this.toRoman(marks) : '';
    },

    /** Roman trial counter for held worship (I … III before ascension). */
    heldTrialsRoman(heldTrials) {
        const n = Math.floor(Number(heldTrials) || 0);
        if (n <= 0) return '';
        const need = typeof DEVOTION_TRIALS_TO_ASCEND !== 'undefined' ? DEVOTION_TRIALS_TO_ASCEND : 3;
        return this.toRoman(Math.min(n, need));
    },

    canRescore(state, category) {
        return this.hasBeenScored(state, category) && this.canScoreCategory(state, category);
    },

    applyConsecration(state, targetCategory, god, sourceCategory) {
        if (!targetCategory || !god || !sourceCategory) return;
        this.ensureState(state);
        state.categoryGodBinding[targetCategory] = god;
        state.categoryScoringOverride[targetCategory] = sourceCategory;
        this.addCapacity(state, targetCategory, 1);
    },
};

if (typeof window !== 'undefined') window.DevotionUtils = DevotionUtils;
