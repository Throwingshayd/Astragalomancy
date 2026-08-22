/**
 * GnosisDisplay — pure helpers for live-score face math and pip split (preview UI).
 * Scoring totals come from ScoringEngine.runPipeline; this module only shapes display.
 * @module GnosisDisplay
 */

const GnosisDisplay = {
    getFacesAndCounts(state) {
        const faces = (state?.dice || []).map((d) => {
            const face = typeof d.getEffectiveFace === 'function' ? d.getEffectiveFace() : 0;
            return (typeof face === 'number' && !isNaN(face)) ? face : 0;
        });
        const counts = {};
        faces.forEach((val) => {
            if (val > 0) counts[val] = (counts[val] || 0) + 1;
        });
        return { faces, counts };
    },

    getDicePips(category, state, counts = null) {
        const c = counts || this.getFacesAndCounts(state).counts;
        const upper = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines'];
        if (upper.includes(category)) {
            const num = typeof CATEGORY_TO_NUMBER !== 'undefined' ? CATEGORY_TO_NUMBER[category] : 0;
            return (c[num] || 0) * num;
        }
        let sum = Object.entries(c).reduce((a, [k, n]) => a + Number(k) * n, 0);
        if (['Three of a Kind', 'Four of a Kind'].includes(category)
            && state?.boons?.some((j) => j.id === 'bellows_of_war')) {
            const threshold = (category === 'Three of a Kind'
                ? SCORING_THRESHOLDS.THREE_OF_KIND_REQUIRED
                : SCORING_THRESHOLDS.FOUR_OF_KIND_REQUIRED) - 1;
            const matchKey = Object.keys(c).find((k) => c[k] >= threshold);
            if (matchKey) sum += parseInt(matchKey, 10);
        }
        return sum;
    },

    getCategoryPipBonus(category, state, counts = {}) {
        if (!category) return 0;
        const god = typeof DevotionUtils !== 'undefined'
            ? DevotionUtils.getGodForCategory(state, category)
            : (typeof GodUtils !== 'undefined' ? GodUtils.getGodForCategory(category) : null);
        const pipCategory = typeof DevotionUtils !== 'undefined'
            ? DevotionUtils.getPipCategory(state, category)
            : category;
        const level = god && state?.worshipLevels ? (state.worshipLevels[god] || 0) : 0;
        const basePips = (typeof LOWER_SECTION_BONUSES !== 'undefined' && LOWER_SECTION_BONUSES[pipCategory]) || 0;
        const pipsPerLevel = (typeof CATEGORY_PIPS_PER_LEVEL !== 'undefined' && CATEGORY_PIPS_PER_LEVEL[pipCategory]) || 0;
        return basePips + level * (pipsPerLevel || 0);
    },

    formatPipsLabel(_category, _state, _counts = null) {
        return 'pips';
    },

    /**
     * Split pipeline pips into Gnosis row: dice subtotal, then +extra
     * (offering floor, worship, boons) as the slide-in chip beside the number.
     * @param {string} category
     * @param {Object} state
     * @param {{ pips: number, isValid: boolean }} totals - from calculateScore / runPipeline
     */
    buildPreviewSplit(category, state, totals) {
        const { counts } = this.getFacesAndCounts(state);
        if (!totals.isValid) {
            return { counts, dicePips: 0, extraPips: 0, pipsLabel: 'pips' };
        }
        const dicePips = this.getDicePips(category, state, counts);
        const extraPips = Math.max(0, Math.floor(totals.pips) - dicePips);
        return {
            counts,
            dicePips,
            extraPips,
            pipsLabel: 'pips',
        };
    },
};

if (typeof window !== 'undefined') window.GnosisDisplay = GnosisDisplay;
