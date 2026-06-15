import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll } from 'vitest';

describe('DevotionUtils pantheon devotion', () => {
    beforeAll(() => {
        globalThis.DEVOTION_BASE_CAPACITY = 1;
        globalThis.GodUtils = {
            getGodForCategory: (cat) => ({ Ones: 'Artemis', 'Small Straight': 'Hermes' }[cat] || null),
            getCategory: (god) => ({ Artemis: 'Ones', Hermes: 'Small Straight' }[god] || null),
        };
        const src = readFileSync('game/js/utils/DevotionUtils.js', 'utf8')
            .replace('if (typeof window !== \'undefined\') window.DevotionUtils = DevotionUtils;', 'globalThis.DevotionUtils = DevotionUtils;');
        // eslint-disable-next-line no-eval
        eval(src);
    });

    it('allows re-score when devotion capacity increases', () => {
        const state = { scorecard: {}, pantheonDevotion: {}, unlockedCategories: {} };
        expect(globalThis.DevotionUtils.canScoreCategory(state, 'Ones')).toBe(true);
        globalThis.DevotionUtils.applyPantheonScore(state, 'Ones', 40);
        expect(globalThis.DevotionUtils.canScoreCategory(state, 'Ones')).toBe(false);
        globalThis.DevotionUtils.addCapacity(state, 'Ones', 1);
        expect(globalThis.DevotionUtils.canScoreCategory(state, 'Ones')).toBe(true);
        globalThis.DevotionUtils.applyPantheonScore(state, 'Ones', 50);
        expect(state.scorecard.Ones).toBe(90);
    });

    it('consecration turns slot into worship hand (two Full House slots)', () => {
        const state = {
            scorecard: {},
            worshipLevels: { Dionysus: 1, Hera: 0 },
            unlockedCategories: {},
        };
        globalThis.DevotionUtils.applyConsecration(state, 'Fours', 'Dionysus', 'Full House');
        expect(globalThis.DevotionUtils.getEvalCategory(state, 'Fours')).toBe('Full House');
        expect(globalThis.DevotionUtils.getDisplayCategory(state, 'Fours')).toBe('Full House');
        expect(globalThis.DevotionUtils.isConsecratedSlot(state, 'Fours')).toBe(true);
        expect(globalThis.DevotionUtils.countSlotsForHand(state, 'Full House')).toBe(2);
    });

    it('consecration retargets scoring hand and god', () => {
        const state = {
            scorecard: {},
            worshipLevels: { Artemis: 2, Hermes: 0 },
            unlockedCategories: {},
        };
        globalThis.DevotionUtils.applyConsecration(state, 'Small Straight', 'Artemis', 'Ones');
        expect(globalThis.DevotionUtils.getEvalCategory(state, 'Small Straight')).toBe('Ones');
        expect(globalThis.DevotionUtils.getDisplayCategory(state, 'Small Straight')).toBe('Ones');
        expect(globalThis.DevotionUtils.getGodForCategory(state, 'Small Straight')).toBe('Artemis');
        expect(globalThis.DevotionUtils.getCapacity(state, 'Small Straight')).toBe(2);
    });

    it('formats held-trial roman counters', () => {
        expect(globalThis.DevotionUtils.heldTrialsRoman(1)).toBe('I');
        expect(globalThis.DevotionUtils.heldTrialsRoman(2)).toBe('II');
        expect(globalThis.DevotionUtils.heldTrialsRoman(3)).toBe('III');
    });
});
