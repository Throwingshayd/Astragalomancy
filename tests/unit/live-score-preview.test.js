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
    return {
        textContent: '',
        hidden: false,
        classList: { add() {}, remove() {} },
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
        const liveScoreDisplay = makeNode({ 'data-live-root': '' });
        liveScoreDisplay.querySelector = (sel) => {
            if (sel === '[data-live="row"]') return row;
            if (sel === '[data-live="row-na"]') return rowNa;
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
                filledSlot ? 'Offering made to Dionysus' : `Offering ${category}`
            ),
            getCategoryLevelBonuses: () => ({ pips: 0, mult: 1 }),
            formatFavour: (n) => String(n),
        };
        const ctrl = new globalThis.LiveScoreController(engine);
        return { ctrl, engine, trialDisplay, row, rowNa, calculateScore };
    }

    it('hovering a filled row shows offering text and does not call calculateScore', () => {
        const { ctrl, trialDisplay, row, rowNa, calculateScore } = makeHarness({ filled: true });
        ctrl.updateDisplay('Twos');
        expect(calculateScore).not.toHaveBeenCalled();
        expect(trialDisplay.textContent).toBe('Offering made to Dionysus');
        expect(ctrl.hoverOfferingMessage()).toBe('Offering made to Dionysus');
        expect(row.hidden).toBe(true);
        expect(rowNa.hidden).toBe(false);
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
        const prevGame = globalThis.window.game;
        globalThis.window.game = {
            ensureLiveScore: () => ({
                entryHintMessage: () => null,
                hoverOfferingMessage: () => 'Offering made to Dionysus',
            }),
        };
        globalThis.window.NumberFormat = { display: String };
        globalThis.InfoBarRenderer.updateTrialBanner(
            { trialDisplay: el },
            { ante: 4, totalScore: 550, scoreThreshold: 600 },
        );
        expect(el.textContent).toBe('Offering made to Dionysus');
        globalThis.window.game = prevGame;
    });
});
