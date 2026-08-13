/**
 * The hourglass plaque counts the turn upwards (I → XIII) while the glass drains.
 * Numeral and sand deliberately run opposite ways, so this guards both at once.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8')
        .replace(
            `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
            `globalThis.${exportName} = ${exportName};`,
        );
    // eslint-disable-next-line no-eval
    eval(src);
}

function makeHarness() {
    const turnDisplay = { textContent: '', style: {} };
    const stream = { style: {} };
    const marks = {
        dataset: { count: '13' },
        querySelectorAll: () => [],
    };
    const root = {
        dataset: {},
        attrs: {},
        vars: {},
        classes: new Set(),
        style: { setProperty(name, val) { root.vars[name] = val; } },
        classList: {
            add: (n) => root.classes.add(n),
            remove: (n) => root.classes.delete(n),
        },
        getBoundingClientRect: () => ({}),
        setAttribute(name, val) { root.attrs[name] = val; },
    };
    const nodes = {
        turnDisplay, clepsydraStream: stream, clepsydra: root, clepsydraMarks: marks,
    };
    globalThis.document = { getElementById: (id) => nodes[id] ?? null };
    return { turnDisplay, root };
}

describe('Clepsydra turn readout', () => {
    beforeAll(() => {
        globalThis.window = globalThis;
        // Reduced motion short-circuits the grain particles, which need a real DOM.
        globalThis.matchMedia = () => ({ matches: true });
        globalThis.document = { getElementById: () => null };
        loadScript('game/js/ui/renderers/InfoBarRenderer.js', 'InfoBarRenderer');
    });

    it('counts the turn up from I and clamps at the last turn', () => {
        const r = globalThis.InfoBarRenderer;
        expect(r.turnNumber({ turn: 1, maxTurns: 13 })).toBe(1);
        expect(r.turnNumber({ turn: 4, maxTurns: 13 })).toBe(4);
        expect(r.turnNumber({ turn: 13, maxTurns: 13 })).toBe(13);
        // Past the last turn the plaque holds at maxTurns rather than reading XIV.
        expect(r.turnNumber({ turn: 14, maxTurns: 13 })).toBe(13);
        expect(r.turnNumber({})).toBe(1);
    });

    it('shows the rising turn on the plaque while the sand tracks what is left', () => {
        const r = globalThis.InfoBarRenderer;
        const { turnDisplay, root } = makeHarness();

        r.updateClepsydra({ turn: 1, maxTurns: 13 });
        expect(turnDisplay.textContent).toBe('I');
        expect(root.vars['--clep-top']).toBe('100%');

        r.updateClepsydra({ turn: 2, maxTurns: 13 });
        expect(turnDisplay.textContent).toBe('II');

        r.updateClepsydra({ turn: 11, maxTurns: 13 });
        expect(turnDisplay.textContent).toBe('XI');
        // Sand and urgency stay on turns remaining (3 left => 'low'), not the numeral.
        expect(root.dataset.remaining).toBe('3');
        expect(root.dataset.state).toBe('low');
        expect(root.attrs['aria-valuenow']).toBe('11');
        expect(root.attrs['aria-valuetext']).toBe('Turn XI of 13');
    });

    it('the markup starts the plaque at I, not a full XIII', () => {
        const html = readFileSync('game/index.html', 'utf8');
        expect(html).toMatch(/id="turnDisplay">I</);
        expect(html).toContain('aria-valuenow="1"');
    });
});
