import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8').replace(
        `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
        `globalThis.${exportName} = ${exportName};`,
    );
    // eslint-disable-next-line no-eval
    eval(src);
}

describe('ScoringAnimation order', () => {
    beforeAll(() => {
        globalThis.window = globalThis;
        globalThis.document = {
            querySelector: () => null,
            querySelectorAll: () => [],
        };
        globalThis.BASE_FAVOUR = 100;
        globalThis.WORSHIP_FAVOUR_PER_LEVEL = 25;
        loadScript('game/js/ui/ScoringAnimation.js', 'ScoringAnimation');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('counts each die, then offering bonus pips, then boons', () => {
        vi.useFakeTimers();
        const updates = [];
        const liveScoreEl = {
            classList: { add() {}, remove() {} },
            querySelector: () => null,
        };
        const engine = {
            isScoring: false,
            state: { worshipLevels: {} },
            scaleDelay: (n) => n,
            formatDisplay: (n) => String(n),
            formatFavour: (n) => String(n),
            formatFavourContrib: (n) => String(n),
            getLiveOfferingTitle: () => 'Large Straight offered to Apollo',
            getGodForCategory: () => 'Apollo',
            prng: { random: () => 0.5 },
            ensureLiveScore: () => ({
                setScoringOffering() {},
                updateValues(_el, o) { updates.push({ pips: o.pips, pipsAdd: o.pipsAdd, pipsContrib: o.pipsContrib }); },
            }),
        };
        const anim = new globalThis.ScoringAnimation(engine);
        anim.getDiceContributions = () => [
            { pips: 5, dieIndex: 0, source: 'die' },
            { pips: 6, dieIndex: 1, source: 'die' },
        ];
        anim.getCategoryPipBase = () => 40;
        anim.getBoonContributions = () => [
            { boonId: 'test_boon', boonName: 'Test', pips: 8, favour: 0, source: 'boon' },
        ];
        anim.jiggleDie = () => {};
        anim.showPipPopupOnDie = () => {};
        anim.jiggleBoon = () => {};
        anim.showBoonPopup = () => {};

        anim.playSequential('Large Straight', 59, 100, 59, null, liveScoreEl, null, () => {});

        const snap = () => updates.map((u) => (u.pipsAdd ? `${u.pips}+${u.pipsContrib}` : u.pips));
        expect(snap()).toEqual(['0']);

        vi.advanceTimersByTime(180);
        expect(snap().at(-1)).toBe('0+5');
        vi.advanceTimersByTime(130);
        expect(snap().at(-1)).toBe('5');

        vi.advanceTimersByTime(50);
        expect(snap().at(-1)).toBe('5+6');
        vi.advanceTimersByTime(130);
        expect(snap().at(-1)).toBe('11');

        vi.advanceTimersByTime(90);
        expect(snap().at(-1)).toBe('11+40');
        vi.advanceTimersByTime(130);
        expect(snap().at(-1)).toBe('51');

        vi.advanceTimersByTime(330);
        expect(snap().at(-1)).toBe('51+8');
        vi.advanceTimersByTime(130);
        expect(snap().at(-1)).toBe('59');
    });
});
