import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Ratchet guardrails: these ceilings are frozen at today's measured values, not
 * aspirational targets. A file may shrink (lower the number here) but must never
 * grow past its ceiling without an explicit, reviewed change to this file.
 *
 * Why this exists: a prior manual review (deleted 2026-07) diagnosed god-object
 * growth and window.* coupling as the recurring source of cross-file regressions,
 * proposed a fix plan, and that plan was not enforced — the flagged files grew
 * further in the months after the review instead of shrinking. This test makes
 * the same regression fail `npm test` instead of relying on anyone re-reading a doc.
 */
const CEILINGS = {
    'game/js/game/GameEngine.js': { lines: 1597, windowRefs: 10 },
    'game/js/classes/Boon.js': { lines: 830, windowRefs: 12 },
    'game/js/ui/ShopUI.js': { lines: 860, windowRefs: 7 },
    'game/js/ui/BalatroEffects.js': { lines: 646, windowRefs: 5 },
    'game/js/classes/boonTimingHandlers.js': { lines: 612, windowRefs: 2 },
    // Main.js grew deliberately here: it now builds one `services` object (sound, effects, data,
    // stateManager, gameStates, numberFormat, uiManager, shopManager, app) at bootstrap and injects
    // it into UIManager/ShopUI/GameEngine, replacing ~130 scattered window.* reach-throughs in those
    // three files with getters that fall back to these globals. The remaining refs here are the
    // single consolidated read site for each singleton, not spread-out coupling.
    'game/js/Main.js': { lines: 603, windowRefs: 36 },
};

const countLines = (content) => content.split(/\r?\n/).length;
const countWindowRefs = (content) => (content.match(/window\.\w+/g) || []).length;

describe('architecture guardrails (ratchet, not aspiration)', () => {
    Object.entries(CEILINGS).forEach(([path, ceiling]) => {
        it(`${path} does not grow past its line ceiling (${ceiling.lines})`, () => {
            const content = readFileSync(path, 'utf8');
            expect(countLines(content)).toBeLessThanOrEqual(ceiling.lines);
        });

        it(`${path} does not add new window.* global reach-throughs past its ceiling (${ceiling.windowRefs})`, () => {
            const content = readFileSync(path, 'utf8');
            expect(countWindowRefs(content)).toBeLessThanOrEqual(ceiling.windowRefs);
        });
    });

    it('Boon timing-effect methods accept an explicit game reference instead of only reading window.game', () => {
        const boon = readFileSync('game/js/classes/Boon.js', 'utf8');
        expect(boon).toMatch(/onTimingEvent\(timingEvent, gameState, eventData = null, game = null\)/);
        expect(boon).toMatch(/applyTimingEffect\(timingEvent, gameState, eventData, game = null\)/);
        [
            'applyBeforeRollEffect', 'applyAfterRollEffect', 'applyBeforeScoreEffect',
            'applyAfterScoreEffect', 'applyTurnStartEffect', 'applyTurnEndEffect',
            'applySellEffect', 'applyAnteEndEffect',
        ].forEach((method) => {
            expect(boon).toMatch(new RegExp(`${method}\\(gameState, \\w+, (game|_game) = null\\)`));
        });

        const handlers = readFileSync('game/js/classes/boonTimingHandlers.js', 'utf8');
        expect(handlers).toMatch(/runBeforeScore\(boon, gameState, result, game = null\)/);
        expect(handlers).toContain('const engine = game || window.game;');
    });

    it('persist and boon face chips stay extracted so the god files can take the next feature', () => {
        const html = readFileSync('game/index.html', 'utf8');
        expect(html.indexOf('BoonDisplayStats.js')).toBeGreaterThan(-1);
        expect(html.indexOf('BoonDisplayStats.js')).toBeLessThan(html.indexOf('Boon.js'));
        expect(html.indexOf('GamePersistence.js')).toBeGreaterThan(-1);
        expect(html.indexOf('GamePersistence.js')).toBeLessThan(html.indexOf('GameEngine.js'));
        expect(html.indexOf('CategoryUnlock.js')).toBeGreaterThan(-1);
        expect(html.indexOf('CategoryUnlock.js')).toBeLessThan(html.indexOf('GameEngine.js'));

        const engine = readFileSync('game/js/game/GameEngine.js', 'utf8');
        expect(engine).toContain('GamePersistence.save(this)');
        expect(engine).toContain('GamePersistence.rehydrate(this, plain, prngState)');
        expect(engine).toContain('CategoryUnlock.onRoll(this)');

        const boon = readFileSync('game/js/classes/Boon.js', 'utf8');
        expect(boon).toContain('BoonDisplayStats.live(this, gameState)');
        expect(boon).not.toContain('window.NumberFormat');
    });
});
