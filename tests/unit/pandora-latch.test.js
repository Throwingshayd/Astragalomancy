import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8').replace(
        `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
        `globalThis.${exportName} = ${exportName};`,
    );
    eval(src);
}

describe('PandoraLatch', () => {
    beforeAll(() => {
        globalThis.window = globalThis;
        globalThis.CategoryUnlock = { grantSixthAstragalus() { this.sixth = true; } };
        loadScript('game/js/game/PandoraLatch.js', 'PandoraLatch');
    });

    const L = () => globalThis.PandoraLatch;

    function engineWith(faces, extras = {}) {
        return {
            state: {
                dice: faces.map((f) => ({ getEffectiveFace: () => f, face: f })),
                unlockedCategories: {},
                ...extras,
            },
            showMessage() {},
            updateMaxTurns() { this.maxTurnsUpdated = true; },
            getDieFaceValue(d) { return d.getEffectiveFace(); },
        };
    }

    it('marks a face when that row is scored with at least three of it', () => {
        const engine = engineWith([1, 1, 1, 4, 5]);
        L().afterScore(engine, 'Ones');
        expect(engine.state.jarFaceMarks[1]).toBe(true);
        expect(engine.state.jarDashes).toBe(0);
    });

    it('does not mark Ones from only two 1s', () => {
        const engine = engineWith([1, 1, 3, 4, 5]);
        L().afterScore(engine, 'Ones');
        expect(engine.state.jarFaceMarks[1]).toBe(false);
    });

    it('opens Sevens and queues the Pleiades line when 1–6 are all marked', () => {
        const engine = engineWith([6, 6, 6, 1, 2]);
        engine.state.jarFaceMarks = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: false };
        L().afterScore(engine, 'Sixes');
        expect(engine.state.jarDashes).toBe(1);
        expect(engine.state.unlockedCategories.Sevens).toBe(true);
        expect(engine.state.pendingJarLines[0]).toMatch(/Pleiades/);
        expect(engine.state.jarFaceMarks[1]).toBe(false);
    });

    it('announces queued lines on cashout', () => {
        const shown = [];
        const engine = {
            state: { pendingJarLines: ['The Pleiades announce themselves to the pantheon.'] },
            showMessage(msg) { shown.push(msg); },
        };
        expect(L().announceCashout(engine)).toHaveLength(1);
        expect(shown[0]).toMatch(/Pleiades/);
        expect(engine.state.pendingJarLines).toEqual([]);
    });
});
