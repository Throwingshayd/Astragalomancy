import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('ScoringEngine.validateRun wiring', () => {
    it('ScoringEngine exposes validateRun before runPipeline', () => {
        const js = readFileSync('game/js/engine/ScoringEngine.js', 'utf8');
        expect(js).toContain('validateRun(state, category)');
        expect(js.indexOf('validateRun')).toBeLessThan(js.indexOf('runPipeline(category'));
    });

    it('calculateScore delegates validation to ScoringEngine.validateRun', () => {
        const js = readFileSync('game/js/game/GameEngine.js', 'utf8');
        expect(js).toContain('ScoringEngine.validateRun(this.state, category)');
        expect(js).not.toMatch(/if\s*\(\s*!fromPipeline\s*\)/);
    });

    it('inventory drag extracted from UIManager', () => {
        const ui = readFileSync('game/js/ui/UIManager.js', 'utf8');
        expect(ui).toContain('BoonSlotDrag.bind');
        expect(ui).toContain('ConsumableDrag.bind');
        const lines = ui.split(/\r?\n/).length;
        expect(lines).toBeLessThan(500);
    });

    it('CollectionManager lives in its own module', () => {
        const main = readFileSync('game/js/Main.js', 'utf8');
        expect(main).not.toContain('class CollectionManager');
        expect(readFileSync('game/js/ui/CollectionManager.js', 'utf8')).toContain('class CollectionManager');
    });

    it('LiveScoreController owns preview and cashout DOM updates', () => {
        const ctrl = readFileSync('game/js/ui/LiveScoreController.js', 'utf8');
        const engine = readFileSync('game/js/game/GameEngine.js', 'utf8');
        expect(ctrl).toContain('buildPreviewSplit');
        expect(ctrl).not.toContain('onTimingEvent');
        expect(engine).toContain('new LiveScoreController(this)');
        expect(engine).toContain('ensureLiveScore()?.schedulePreview');
    });

    it('GameEngineTestModes extracted from GameEngine', () => {
        const engine = readFileSync('game/js/game/GameEngine.js', 'utf8');
        const modes = readFileSync('game/js/game/GameEngineTestModes.js', 'utf8');
        const html = readFileSync('game/index.html', 'utf8');
        expect(engine).toContain('GameEngineTestModes.applyFromUrl');
        expect(engine).not.toContain('applyWinningHandsTestMode');
        expect(modes).toContain('class GameEngineTestModes');
        expect(modes).toContain('applyWinningHands');
        expect(html.indexOf('GameEngineTestModes.js')).toBeLessThan(html.indexOf('GameEngine.js'));
    });

    it('ScoringAnimation extracted from GameEngine', () => {
        const engine = readFileSync('game/js/game/GameEngine.js', 'utf8');
        const anim = readFileSync('game/js/ui/ScoringAnimation.js', 'utf8');
        const html = readFileSync('game/index.html', 'utf8');
        expect(engine).toContain('ensureScoringAnimation');
        expect(engine).toContain('playReveal(category');
        expect(engine).not.toContain('animateSequentialScoring(');
        expect(engine).not.toContain('createScoreParticles(');
        expect(anim).toContain('class ScoringAnimation');
        expect(anim).toContain('playSequential(');
        expect(html.indexOf('ScoringAnimation.js')).toBeLessThan(html.indexOf('GameEngine.js'));
    });
});
