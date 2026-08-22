/**
 * Scoring must stay finite no matter how hard boons stack. A runaway or buggy
 * boon value must never surface NaN/Infinity in the reveal or silently collapse
 * the score to 0. Score is pips × favour — no third favourMult layer.
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

describe('SafeMath naneinf protection', () => {
    beforeAll(() => {
        loadScript('game/js/engine/SafeMath.js', 'SafeMath');
    });
    const S = () => globalThis.SafeMath;

    it('clampScore handles NaN, Infinity, negatives and overflow', () => {
        expect(S().clampScore(NaN)).toBe(0);
        expect(S().clampScore(Infinity)).toBe(S().MAX_SAFE_INT);
        expect(S().clampScore(-Infinity)).toBe(0);
        expect(S().clampScore(-5)).toBe(0);
        expect(S().clampScore(1e400)).toBe(S().MAX_SAFE_INT);
        expect(S().clampScore(42.9)).toBe(42);
    });

    it('safeMultiply never returns NaN or Infinity', () => {
        expect(S().safeMultiply(NaN, 5)).toBe(0);
        expect(S().safeMultiply(20, 3)).toBe(60);
        expect(S().safeMultiply(1e308, 1e308)).toBe(S().MAX_SAFE_INT);
        expect(Number.isFinite(S().safeMultiply(Infinity, 2))).toBe(true);
    });

    it('safeAdd coerces NaN operands to 0', () => {
        expect(S().safeAdd(NaN, 5)).toBe(5);
        expect(S().safeAdd(10, 20)).toBe(30);
    });
});

describe('ScoringEngine.runPipeline stays finite under runaway boons', () => {
    beforeAll(() => {
        globalThis.window = globalThis;
        globalThis.CATEGORY_TO_NUMBER = {
            Ones: 1, Twos: 2, Threes: 3, Fours: 4, Fives: 5, Sixes: 6, Sevens: 7, Eights: 8, Nines: 9,
        };
        globalThis.GOD_TO_CATEGORY = {};
        loadScript('game/js/engine/SafeMath.js', 'SafeMath');
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

    it('scores a clean hand as pips × favour', () => {
        const r = run([]);
        expect(r.pips).toBe(20);
        expect(r.favour).toBe(100);
        expect(r.finalScore).toBe(2000);
        expect(r).not.toHaveProperty('favourMult');
    });

    it('×Favour boons multiply the same favour the reveal shows', () => {
        const r = run([boon((d) => { d.favour *= 2.5; return d; })]);
        expect(r.pips).toBe(20);
        expect(r.favour).toBe(250);
        expect(r.finalScore).toBe(5000);
    });

    it('Infinity favour clamps to a finite MAX score (not 0 or NaN)', () => {
        const r = run([boon((d) => { d.favour = Infinity; return d; })]);
        expect(Number.isFinite(r.favour)).toBe(true);
        expect(Number.isFinite(r.finalScore)).toBe(true);
        expect(r.finalScore).toBe(MAX());
    });

    it('NaN favour falls back to a neutral multiplier', () => {
        const r = run([boon((d) => { d.favour = NaN; return d; })]);
        expect(Number.isNaN(r.favour)).toBe(false);
        expect(Number.isNaN(r.finalScore)).toBe(false);
        expect(r.finalScore).toBe(2000);
    });

    it('Infinity pips clamps rather than overflowing to 0', () => {
        const r = run([boon((d) => { d.pips = Infinity; return d; })]);
        expect(Number.isFinite(r.pips)).toBe(true);
        expect(r.finalScore).toBe(MAX());
    });

    it('negative favour is held at the 10 floor', () => {
        const r = run([boon((d) => { d.favour = -100; return d; })]);
        expect(r.favour).toBe(10);
        expect(r.finalScore).toBe(200);
    });

    it('stacked ×Favour boons stay finite and clamped', () => {
        const times = (m) => boon((d) => { d.favour *= m; return d; });
        const r = run([times(1e6), times(1e6), times(1e6)]);
        expect(Number.isFinite(r.finalScore)).toBe(true);
        expect(r.finalScore).toBeLessThanOrEqual(MAX());
    });
});
