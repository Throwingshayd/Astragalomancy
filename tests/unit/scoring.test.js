/**
 * Score is Pips × (Favour / 100). Favour 100 is ×1.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8').replace(
        `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
        `globalThis.${exportName} = ${exportName};`,
    );
    // eslint-disable-next-line no-eval
    eval(src);
}

describe('SafeMath', () => {
    beforeAll(() => {
        loadScript('game/js/engine/SafeMath.js', 'SafeMath');
    });
    const S = () => globalThis.SafeMath;

    it('clampScore floors, and keeps a finite integer', () => {
        expect(S().clampScore(NaN)).toBe(0);
        expect(S().clampScore(Infinity)).toBe(S().MAX_SAFE_INT);
        expect(S().clampScore(-Infinity)).toBe(0);
        expect(S().clampScore(-5)).toBe(0);
        expect(S().clampScore(1e400)).toBe(S().MAX_SAFE_INT);
        expect(S().clampScore(42.9)).toBe(42);
    });

    it('safeMultiply and safeAdd stay finite', () => {
        expect(S().safeMultiply(NaN, 5)).toBe(0);
        expect(S().safeMultiply(20, 3)).toBe(60);
        expect(S().safeMultiply(1e308, 1e308)).toBe(S().MAX_SAFE_INT);
        expect(Number.isFinite(S().safeMultiply(Infinity, 2))).toBe(true);
        expect(S().safeAdd(NaN, 5)).toBe(5);
        expect(S().safeAdd(10, 20)).toBe(30);
    });
});

describe('ScoringEngine.runPipeline', () => {
    beforeAll(() => {
        globalThis.window = globalThis;
        globalThis.CATEGORY_TO_NUMBER = {
            Ones: 1, Twos: 2, Threes: 3, Fours: 4, Fives: 5, Sixes: 6, Sevens: 7, Eights: 8, Nines: 9,
        };
        globalThis.GOD_TO_CATEGORY = {};
        loadScript('game/js/engine/SafeMath.js', 'SafeMath');
        loadScript('game/js/engine/DieScoreContribution.js', 'DieScoreContribution');
        loadScript('game/js/engine/HandEvaluator.js', 'HandEvaluator');
        loadScript('game/js/engine/ScoringEngine.js', 'ScoringEngine');
    });

    const die = (face) => ({ getEffectiveFace: () => face, hasEnhancementForCurrentFace: () => false });
    const baseState = (boons = []) => ({
        dice: [die(4), die(4), die(4), die(4), die(4)],
        boons,
        worshipLevels: {},
        unlockedCategories: {},
    });
    const boon = (fn) => ({
        triggerPhase: 'hand',
        timing: { before_score: true },
        onTimingEvent: (_evt, _state, data) => fn(data),
    });
    const run = (boons) => globalThis.ScoringEngine.runPipeline('Chance', baseState(boons));
    const MAX = () => globalThis.SafeMath.MAX_SAFE_INT;

    it('naked Chance is pips × 1', () => {
        const r = run([]);
        expect(r.pips).toBe(20);
        expect(r.favour).toBe(100);
        expect(r.finalScore).toBe(20);
    });

    it('×Favour multiplies the same Favour the reveal shows', () => {
        const r = run([boon((d) => { d.favour *= 2.5; return d; })]);
        expect(r.pips).toBe(20);
        expect(r.favour).toBe(250);
        expect(r.finalScore).toBe(50);
    });

    it('non-finite Favour or pips clamp to a finite score', () => {
        const infFavour = run([boon((d) => { d.favour = Infinity; return d; })]);
        expect(infFavour.finalScore).toBe(MAX());
        const nanFavour = run([boon((d) => { d.favour = NaN; return d; })]);
        expect(nanFavour.finalScore).toBe(20);
        const infPips = run([boon((d) => { d.pips = Infinity; return d; })]);
        expect(infPips.finalScore).toBe(MAX());
    });

    it('Favour below the floor scores at the floor', () => {
        const r = run([boon((d) => { d.favour = -100; return d; })]);
        expect(r.favour).toBe(10);
        expect(r.finalScore).toBe(2);
    });
});
