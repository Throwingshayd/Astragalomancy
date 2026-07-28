import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Minimal DevotionUtils stand-in so TrialCompletion works under node without the full game.
 */
globalThis.DevotionUtils = {
    hasBeenScored(state, category) {
        return state.scorecard[category] !== undefined;
    },
};

const TrialCompletion = (() => {
    const src = readFileSync('game/js/game/TrialCompletion.js', 'utf8');
    // eslint-disable-next-line no-new-func
    const factory = new Function(`${src}; return TrialCompletion;`);
    return factory();
})();

function baseState(overrides = {}) {
    return {
        scorecard: {},
        unlockedCategories: {},
        totalScore: 0,
        scoreThreshold: 200,
        gameOver: false,
        transitioningToShop: false,
        ante: 1,
        ...overrides,
    };
}

describe('TrialCompletion — hubris Depart', () => {
    it('canDepartEarly only when over threshold with unfilled categories', () => {
        const under = baseState({
            totalScore: 150,
            scorecard: { Ones: 5, Twos: 8 },
        });
        expect(TrialCompletion.canDepartEarly(under)).toBe(false);

        const over = baseState({
            totalScore: 220,
            scorecard: { Ones: 5, Twos: 8, Chance: 20 },
        });
        expect(TrialCompletion.canDepartEarly(over)).toBe(true);
    });

    it('cannot Depart when the full ritual is already filled', () => {
        const cats = TrialCompletion.availableCategories(baseState());
        const scorecard = Object.fromEntries(cats.map((c) => [c, 10]));
        const full = baseState({ totalScore: 500, scorecard });
        expect(TrialCompletion.areAllCategoriesFilled(full)).toBe(true);
        expect(TrialCompletion.canDepartEarly(full)).toBe(false);
    });

    it('leaves unfilled categories empty (countUnfilled)', () => {
        const state = baseState({
            totalScore: 250,
            scorecard: { Ones: 12, Yahtzee: 50 },
        });
        const unused = TrialCompletion.countUnfilledCategories(state);
        expect(unused).toBe(TrialCompletion.availableCategories(state).length - 2);
        expect(state.scorecard.Twos).toBeUndefined();
        expect(state.scorecard.Chance).toBeUndefined();
    });

    it('departEarly runs finish path with hubrisDepart and does not scratch empties', () => {
        const scorecard = { Ones: 12, Twos: 10, Chance: 40 };
        const state = baseState({
            totalScore: 250,
            scoreThreshold: 200,
            scorecard,
            ante: 2,
            boons: [],
            turn: 5,
        });
        let shopOpts = null;
        const engine = {
            state,
            isScoring: false,
            sound: null,
            showMessage() {},
            showInterestThenOpenShop(opts) { shopOpts = opts; },
        };
        // AnteData used by finishAnteAndOpenShop
        globalThis.AnteData = [
            { scoreThreshold: 200 },
            { scoreThreshold: 300 },
            { scoreThreshold: 400 },
        ];

        TrialCompletion.departEarly(engine);

        expect(shopOpts).toEqual(expect.objectContaining({
            hubrisDepart: true,
            pantheonTotal: 250,
            pantheonThreshold: 200,
        }));
        expect(shopOpts.unusedCategories).toBeGreaterThan(0);
        expect(engine.state.scorecard.Ones).toBe(12);
        expect(engine.state.scorecard.Twos).toBe(10);
        expect(engine.state.scorecard.Threes).toBeUndefined();
        expect(engine.state.ante).toBe(3);
        expect(engine.state.turn).toBe(1);
    });

    it('LiveScoreController cashout includes a hubris line when flagged', () => {
        const ctrl = readFileSync('game/js/ui/LiveScoreController.js', 'utf8');
        expect(ctrl).toContain('hubrisDepart');
        expect(ctrl).toContain('Hubris — left the symposium early');
    });

    it('index wires TrialCompletion and Depart button beside Required', () => {
        const html = readFileSync('game/index.html', 'utf8');
        expect(html).toContain('js/game/TrialCompletion.js');
        expect(html).toContain('id="departButton"');
        expect(html).toContain('felt-stone-depart');
        expect(html).toMatch(/felt-stone-required[\s\S]*departButton/);
    });
});
