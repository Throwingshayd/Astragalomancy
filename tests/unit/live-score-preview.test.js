import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll, vi } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8')
        .replace(
            `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
            `globalThis.${exportName} = ${exportName};`,
        );
    // eslint-disable-next-line no-eval
    eval(src);
}

function makeNode(extra = {}) {
    const attrs = {};
    const classes = new Set();
    return {
        textContent: '',
        hidden: false,
        classList: {
            add(...names) { names.forEach((n) => classes.add(n)); },
            remove(...names) { names.forEach((n) => classes.delete(n)); },
            contains(name) { return classes.has(name); },
        },
        setAttribute(name, val) { attrs[name] = val; if (name === 'hidden') this.hidden = true; },
        removeAttribute(name) { delete attrs[name]; if (name === 'hidden') this.hidden = false; },
        hasAttribute(name) { return Object.prototype.hasOwnProperty.call(extra, name) || Object.prototype.hasOwnProperty.call(attrs, name); },
        querySelector() { return null; },
        ...extra,
    };
}

describe('Live score preview hover', () => {
    beforeAll(() => {
        globalThis.DEVOTION_BASE_CAPACITY = 1;
        globalThis.window = globalThis;
        globalThis.document = { getElementById: () => null };
        const devotionSrc = readFileSync('game/js/utils/DevotionUtils.js', 'utf8')
            .replace(
                "if (typeof window !== 'undefined') window.DevotionUtils = DevotionUtils;",
                'globalThis.DevotionUtils = DevotionUtils;',
            );
        // eslint-disable-next-line no-eval
        eval(devotionSrc);
        loadScript('game/js/ui/renderers/InfoBarRenderer.js', 'InfoBarRenderer');
        loadScript('game/js/ui/LiveScoreController.js', 'LiveScoreController');
    });

    function makeHarness({ filled = false, hasRolled = true } = {}) {
        const trialDisplay = makeNode();
        trialDisplay.textContent = '4th Trial: 50 remaining';
        const row = makeNode();
        const rowNa = makeNode();
        rowNa.setAttribute('hidden', '');
        const pipsAdd = makeNode();
        pipsAdd.setAttribute('hidden', '');
        const pipsContrib = makeNode();
        const liveScoreDisplay = makeNode({ 'data-live-root': '' });
        liveScoreDisplay.querySelector = (sel) => {
            if (sel === '[data-live="row"]') return row;
            if (sel === '[data-live="row-na"]') return rowNa;
            if (sel === '[data-live="pips-add"]') return pipsAdd;
            if (sel === '[data-live="pips-contrib"]') return pipsContrib;
            return null;
        };
        const calculateScore = vi.fn(() => ({ pips: 12, favour: 1, isValid: true }));
        const state = {
            hasRolled,
            ante: 4,
            turn: 6,
            totalScore: 550,
            scoreThreshold: 600,
            scorecard: filled ? { Twos: 8 } : {},
            pantheonDevotion: filled ? { Twos: { marks: 1 } } : {},
            devotionCapacity: {},
        };
        if (filled) globalThis.DevotionUtils.ensureState(state);
        const engine = {
            state,
            domReady: true,
            dom: { liveScoreDisplay, trialDisplay },
            calculateScore,
            getLiveOfferingTitle: (category, filledSlot) => (
                filledSlot ? `${category} offered to Dionysus` : `Offering ${category}`
            ),
            getCategoryLevelBonuses: () => ({ pips: 0, mult: 1 }),
            formatFavour: (n) => String(n),
        };
        const ctrl = new globalThis.LiveScoreController(engine);
        return { ctrl, engine, trialDisplay, row, rowNa, pipsAdd, pipsContrib, calculateScore, liveScoreDisplay };
    }

    it('hovering a filled row shows offering text and does not call calculateScore', () => {
        const { ctrl, trialDisplay, row, rowNa, calculateScore } = makeHarness({ filled: true });
        ctrl.updateDisplay('Twos');
        expect(calculateScore).not.toHaveBeenCalled();
        expect(trialDisplay.textContent).toBe('Twos offered to Dionysus');
        expect(ctrl.hoverOfferingMessage()).toBe('Twos offered to Dionysus');
        expect(row.hidden).toBe(true);
        expect(rowNa.hidden).toBe(false);
    });

    it('a filled pantheon row names the offering, not just the god', () => {
        const src = readFileSync('game/js/game/GameEngine.js', 'utf8');
        // "Fours offered to Hera", never the anonymous "Offering made to Hera".
        expect(src).toContain('return `${displayCat} offered to ${godShown}`;');
        expect(src).not.toContain('Offering made to');
    });

    it('hovering an open row shows Offering {category} and previews score', () => {
        const { ctrl, trialDisplay, calculateScore } = makeHarness({ filled: false });
        ctrl.updateDisplay('Twos');
        expect(calculateScore).toHaveBeenCalledWith('Twos');
        expect(trialDisplay.textContent).toBe('Offering Twos');
        expect(ctrl.hoverOfferingMessage()).toBe('Offering Twos');
    });

    it('leaving a row restores the trial remaining banner', () => {
        const { ctrl, trialDisplay } = makeHarness({ filled: true });
        ctrl.updateDisplay('Twos');
        ctrl.cancelPreview();
        expect(ctrl.hoverOfferingMessage()).toBeNull();
        expect(trialDisplay.textContent).toBe('4th Trial: 50 remaining');
    });

    it('InfoBarRenderer keeps offering hover instead of trial remaining', () => {
        const el = makeNode();
        const engine = {
            ensureLiveScore: () => ({
                entryHintMessage: () => null,
                hoverOfferingMessage: () => 'Twos offered to Dionysus',
            }),
        };
        globalThis.InfoBarRenderer.updateTrialBanner(
            { trialDisplay: el },
            { ante: 4, totalScore: 550, scoreThreshold: 600 },
            engine,
        );
        expect(el.textContent).toBe('Twos offered to Dionysus');
    });

    it('contribution chip slides in, then absorbs into the number instead of popping out', () => {
        vi.useFakeTimers();
        try {
            const { ctrl, pipsAdd, pipsContrib, liveScoreDisplay } = makeHarness();

            ctrl.updateValues(liveScoreDisplay, { pips: '20', pipsAdd: true, pipsContrib: '+8' });
            expect(pipsAdd.hidden).toBe(false);
            expect(pipsAdd.classList.contains('is-entering')).toBe(true);
            expect(pipsContrib.textContent).toBe('+8');

            ctrl.updateValues(liveScoreDisplay, { pips: '28', pipsAdd: false });
            expect(pipsAdd.classList.contains('is-entering')).toBe(false);
            expect(pipsAdd.classList.contains('is-absorbing')).toBe(true);
            expect(pipsAdd.hidden).toBe(false);

            vi.advanceTimersByTime(globalThis.LiveScoreController.ADD_CHIP_ABSORB_MS + 1);
            expect(pipsAdd.classList.contains('is-absorbing')).toBe(false);
            expect(pipsAdd.hidden).toBe(true);
            expect(pipsContrib.textContent).toBe('');
        } finally {
            vi.useRealTimers();
        }
    });

    it('a chip re-shown mid-absorb cancels the retire timer and stays visible', () => {
        vi.useFakeTimers();
        try {
            const { ctrl, pipsAdd, pipsContrib, liveScoreDisplay } = makeHarness();

            ctrl.updateValues(liveScoreDisplay, { pips: '20', pipsAdd: true, pipsContrib: '+8' });
            ctrl.updateValues(liveScoreDisplay, { pips: '28', pipsAdd: false });
            ctrl.updateValues(liveScoreDisplay, { pips: '28', pipsAdd: true, pipsContrib: '+4' });

            vi.advanceTimersByTime(globalThis.LiveScoreController.ADD_CHIP_ABSORB_MS + 1);
            expect(pipsAdd.hidden).toBe(false);
            expect(pipsAdd.classList.contains('is-absorbing')).toBe(false);
            expect(pipsAdd.classList.contains('is-entering')).toBe(true);
            expect(pipsContrib.textContent).toBe('+4');
        } finally {
            vi.useRealTimers();
        }
    });

    it('the live score row is never wobbled by the juice manager', () => {
        const juiceUp = vi.fn();
        const prevJuice = globalThis.window.juiceManager;
        globalThis.window.juiceManager = { juiceUp, cancelJuice: vi.fn() };
        try {
            const { ctrl, engine } = makeHarness();
            engine.lastPreviewPips = 0;
            engine.formatDisplay = String;
            ctrl.updateDisplay('Twos');
            ctrl.updateDisplay('Twos');
            expect(juiceUp).not.toHaveBeenCalled();
        } finally {
            globalThis.window.juiceManager = prevJuice;
        }
    });
});
