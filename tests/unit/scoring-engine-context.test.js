/**
 * ScoringEngine.buildContext — the real one, not a copy.
 * The blind it hands the evaluator is the *live* blind, so scoring only feels
 * the boss in the trial's last stretch.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8')
        .replace(
            `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
            `globalThis.${exportName} = ${exportName};`,
        );
    // eslint-disable-next-line no-eval
    eval(src);
}

describe('ScoringEngine.buildContext shape', () => {
    beforeAll(() => {
        globalThis.DEBUG_FLAGS = { BOSS_BLINDS_DISABLED: false };
        loadScript('game/js/game/BlindDirector.js', 'BlindDirector');
        loadScript('game/js/engine/DieScoreContribution.js', 'DieScoreContribution');
        loadScript('game/js/engine/ScoringEngine.js', 'ScoringEngine');
    });

    it('fills defaults for empty state', () => {
        const c = globalThis.ScoringEngine.buildContext({});
        expect(c.boons).toEqual([]);
        expect(c.activeBlind).toBe(null);
        expect(c.unlockedCategories).toEqual({});
    });

    it('preserves provided fields', () => {
        const state = {
            boons: [{ id: 'a' }],
            activeBlind: 'no_chance',
            unlockedCategories: { Sevens: true },
            turn: 8,
        };
        const c = globalThis.ScoringEngine.buildContext(state);
        expect(c.boons).toEqual([{ id: 'a' }]);
        expect(c.unlockedCategories).toEqual({ Sevens: true });
        expect(c.activeBlind).toBe('no_chance');
    });

    it('withholds the blind from the evaluator until the boss segment', () => {
        const state = { activeBlind: 'half_upper_pips', turn: 7 };
        expect(globalThis.ScoringEngine.buildContext(state).activeBlind).toBe(null);
        expect(globalThis.ScoringEngine.buildContext({ ...state, turn: 8 }).activeBlind)
            .toBe('half_upper_pips');
    });
});
