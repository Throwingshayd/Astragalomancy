/**
 * Zeus (Yahtzee) is five of a kind. Heureka is six of a kind and unlocks when rolled.
 * Extra Long Straight is a run of six and unlocks when rolled.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll } from 'vitest';

function loadExports(path, names) {
    const src = readFileSync(path, 'utf8');
    return Function(`${src}; return { ${names.join(', ')} };`)();
}

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8').replace(
        `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
        `globalThis.${exportName} = ${exportName};`,
    );
    // eslint-disable-next-line no-eval
    eval(src);
}

describe('Heureka unlock-on-roll', () => {
    beforeAll(() => {
        const consts = loadExports('game/js/config/ScoringConstants.js', [
            'SCORING_THRESHOLDS',
            'LOWER_SECTION_BONUSES',
            'UNLOCKABLE_SCORE_ROWS',
            'CATEGORY_TO_NUMBER',
        ]);
        Object.assign(globalThis, consts);
        loadScript('game/js/engine/HandEvaluator.js', 'HandEvaluator');
        loadScript('game/js/game/CategoryUnlock.js', 'CategoryUnlock');
    });

    const five = [2, 2, 2, 2, 2];
    const six = [3, 3, 3, 3, 3, 3];
    const counts = (faces) => faces.reduce((acc, f) => {
        acc[f] = (acc[f] || 0) + 1;
        return acc;
    }, {});

    it('scores five of a kind on the Zeus row, not Heureka', () => {
        const H = globalThis.HandEvaluator;
        const ctx = { unlockedCategories: { Heureka: true } };
        expect(H.evaluate('Yahtzee', five, counts(five), ctx).isValid).toBe(true);
        expect(H.evaluate('Heureka', five, counts(five), ctx).isValid).toBe(false);
    });

    it('scores six of a kind on Heureka once the tile is unlocked', () => {
        const H = globalThis.HandEvaluator;
        const locked = H.evaluate('Heureka', six, counts(six), { unlockedCategories: {} });
        const open = H.evaluate('Heureka', six, counts(six), { unlockedCategories: { Heureka: true } });
        expect(locked.isValid).toBe(false);
        expect(open.isValid).toBe(true);
        expect(open.pips).toBe(18 + globalThis.LOWER_SECTION_BONUSES.Heureka);
    });

    it('unlocks Heureka the first time six of a kind is rolled', () => {
        const U = globalThis.CategoryUnlock;
        const engine = {
            state: { unlockedCategories: {} },
            showMessage() {},
            updateMaxTurns() { this.maxTurnsUpdated = true; },
        };
        expect(U.previewHeureka(engine, counts(five))).toBe(false);
        expect(engine.state.unlockedCategories.Heureka).toBeFalsy();
        expect(U.previewHeureka(engine, counts(six))).toBe(true);
        expect(engine.state.unlockedCategories.Heureka).toBe(true);
        expect(engine.maxTurnsUpdated).toBe(true);
        expect(U.previewHeureka(engine, counts(six))).toBe(false);
    });

    it('unlocks Extra Long Straight the first time a six-run is rolled', () => {
        const H = globalThis.HandEvaluator;
        const U = globalThis.CategoryUnlock;
        const fiveRun = [1, 2, 3, 4, 5];
        const sixRun = [1, 2, 3, 4, 5, 6];
        const ctx = { unlockedCategories: { 'Extra Long Straight': true } };
        expect(H.evaluate('Extra Long Straight', fiveRun, counts(fiveRun), ctx).isValid).toBe(false);
        expect(H.evaluate('Large Straight', sixRun, counts(sixRun), ctx).isValid).toBe(true);
        expect(H.evaluate('Extra Long Straight', sixRun, counts(sixRun), { unlockedCategories: {} }).isValid).toBe(false);
        const open = H.evaluate('Extra Long Straight', sixRun, counts(sixRun), ctx);
        expect(open.isValid).toBe(true);
        expect(open.pips).toBe(21 + globalThis.LOWER_SECTION_BONUSES['Extra Long Straight']);

        const engine = {
            state: { unlockedCategories: {} },
            showMessage() {},
            updateMaxTurns() { this.maxTurnsUpdated = true; },
        };
        expect(U.previewExtraLongStraight(engine, fiveRun)).toBe(false);
        expect(engine.state.unlockedCategories['Extra Long Straight']).toBeFalsy();
        expect(U.previewExtraLongStraight(engine, sixRun)).toBe(true);
        expect(engine.state.unlockedCategories['Extra Long Straight']).toBe(true);
        expect(U.previewExtraLongStraight(engine, sixRun)).toBe(false);
    });

    it('lists both roll-unlock rows', () => {
        expect(globalThis.UNLOCKABLE_SCORE_ROWS).toEqual([
            'Sevens', 'Eights', 'Nines', 'Heureka', 'Extra Long Straight',
        ]);
    });
});
