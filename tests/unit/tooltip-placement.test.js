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

function fakeEl(rect, extra = {}) {
    const classNames = new Set();
    return {
        isConnected: true,
        classList: {
            contains: (name) => classNames.has(name),
            add: (...names) => names.forEach((n) => classNames.add(n)),
            remove: (...names) => names.forEach((n) => classNames.delete(n)),
        },
        style: {
            left: '',
            top: '',
            setProperty() {},
        },
        dataset: {},
        getBoundingClientRect: () => rect,
        closest: () => extra.closest || null,
        _classes: classNames,
        ...extra,
    };
}

describe('tooltip placement', () => {
    beforeAll(() => {
        globalThis.window = Object.assign(globalThis.window || globalThis, {
            innerWidth: 1280,
            innerHeight: 800,
        });
        loadScript('game/js/ui/TooltipPlacement.js', 'TooltipPlacement');
    });

    it('keeps table/shop tooltips above or below', () => {
        const tip = fakeEl({ width: 80, height: 40, left: 0, top: 0, right: 80, bottom: 40 });
        const host = fakeEl({ width: 36, height: 36, left: 200, top: 200, right: 236, bottom: 236 });
        globalThis.TooltipPlacement.position(tip, host, { preferBelow: false, gap: 10 });
        expect(tip.dataset.placement).toBe('above');
        expect(tip._classes.has('side-left')).toBe(false);
        expect(tip._classes.has('side-right')).toBe(false);
    });

    it('puts pause-menu tooltips to the side with more room', () => {
        const tip = fakeEl({ width: 80, height: 40, left: 0, top: 0, right: 80, bottom: 40 });
        const host = fakeEl({ width: 36, height: 36, left: 80, top: 240, right: 116, bottom: 276 });
        globalThis.TooltipPlacement.position(tip, host, { preferSide: true, gap: 10 });
        expect(['left', 'right']).toContain(tip.dataset.placement);
        expect(tip._classes.has('side-left') || tip._classes.has('side-right')).toBe(true);
        expect(tip.dataset.placement === 'below').toBe(false);
        expect(parseFloat(tip.style.left)).not.toBeNaN();
    });
});
