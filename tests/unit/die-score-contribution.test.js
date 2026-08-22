/**
 * Clockwork / Pearl / Mirror / Gold extras live in DieScoreContribution.
 * Engine pips, score popups, and die hover must agree.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8').replace(
        `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
        `globalThis.${exportName} = ${exportName};`,
    );
    // eslint-disable-next-line no-eval
    eval(src);
}

function die(face, enhs = [], pearl) {
    return {
        getEffectiveFace: () => face,
        hasEnhancementForCurrentFace: (id) => enhs.includes(id),
        motherOfPearlBonus: pearl,
    };
}

describe('DieScoreContribution parity', () => {
    beforeAll(() => {
        globalThis.window = globalThis;
        globalThis.ENHANCEMENT_BONUSES = {
            IRON_PIPS: 5, GOLD_COINS: 1, PARCHMENT_GOLD: 5, PARCHMENT_FAVOUR: 100, BLESSED_FAVOUR: 10,
        };
        globalThis.ENHANCEMENT_CHANCES = {
            PARCHMENT_GOLD_CHANCE: 0.15, PARCHMENT_FAVOUR_CHANCE: 0.25,
        };
        globalThis.CATEGORY_TO_NUMBER = {
            Ones: 1, Twos: 2, Threes: 3, Fours: 4, Fives: 5, Sixes: 6,
            Sevens: 7, Eights: 8, Nines: 9,
        };
        globalThis.GOD_TO_CATEGORY = {};
        loadScript('game/js/engine/DieScoreContribution.js', 'DieScoreContribution');
        loadScript('game/js/engine/SafeMath.js', 'SafeMath');
        loadScript('game/js/engine/HandEvaluator.js', 'HandEvaluator');
        loadScript('game/js/engine/ScoringEngine.js', 'ScoringEngine');
    });

    const C = () => globalThis.DieScoreContribution;
    const five = (special, restFace = 6) => [
        special,
        die(restFace),
        die(restFace),
        die(restFace),
        die(restFace),
    ];
    const state = (dice) => ({
        dice,
        boons: [],
        worshipLevels: {},
        unlockedCategories: {},
    });

    it('hover: gold Clockwork 6 is +11 pips and +1 gold', () => {
        const preview = C().preview(die(6, ['iron', 'gold']));
        expect(preview.pips).toBe(11);
        expect(preview.gold).toBe(1);
    });

    it('hover: Mirror doubles face and Clockwork', () => {
        expect(C().preview(die(6, ['iron', 'mirror'])).pips).toBe(22);
    });

    it('Chance pipeline adds Clockwork and Mirror the same way hover does', () => {
        const clockwork = die(6, ['iron']);
        const mirrored = die(6, ['iron', 'mirror']);
        expect(globalThis.ScoringEngine.runPipeline('Chance', state(five(clockwork))).pips).toBe(35);
        expect(globalThis.ScoringEngine.runPipeline('Chance', state(five(mirrored))).pips).toBe(46);
    });

    it('Ones still pays Clockwork on a 6; Mirror only when the face counts', () => {
        const preview = C().preview(die(6, ['iron', 'mirror']), 'Ones');
        expect(preview.pips).toBe(5);
        const clockworkSixes = five(die(1, ['iron', 'mirror']), 1);
        expect(globalThis.ScoringEngine.runPipeline('Ones', state(clockworkSixes)).pips).toBe(16);
    });

    it('Mother of Pearl 0 still counts, and engine matches hover', () => {
        const pearl = die(4, ['mother_of_pearl'], 0);
        expect(C().preview(pearl).pips).toBe(4);
        const withPearl = die(4, ['mother_of_pearl'], 3);
        expect(C().preview(withPearl).pips).toBe(7);
        expect(globalThis.ScoringEngine.runPipeline('Chance', state(five(withPearl, 4))).pips).toBe(20 + 3);
    });

    it('Blessed adds +0.1 Favour on hover and in the pipeline', () => {
        const blessed = die(6, ['blessed']);
        expect(C().preview(blessed).favour).toBe(10);
        expect(C().blessedFavour(die(6))).toBe(0);
        const result = globalThis.ScoringEngine.runPipeline('Chance', state(five(blessed)));
        expect(result.favour).toBe(110);
    });

    it('parchment gold and favour roll independently from the same helper', () => {
        const seq = (values) => {
            let i = 0;
            return { random: () => values[i++] };
        };
        expect(C().parchmentOutcome(seq([0.10, 0.10]))).toEqual({ gold: 5, favour: 100 });
        expect(C().parchmentOutcome(seq([0.90, 0.90]))).toEqual({ gold: 0, favour: 0 });
        expect(C().parchmentOutcome(seq([0.10, 0.90]))).toEqual({ gold: 5, favour: 0 });
        const dice = [die(3, ['parchment']), die(4), die(3, ['parchment'])];
        const fortunes = C().resolveParchment(dice, seq([0.10, 0.10, 0.90, 0.10]));
        expect(fortunes).toEqual([
            { dieIndex: 0, gold: 5, favour: 100 },
            { dieIndex: 2, gold: 0, favour: 100 },
        ]);
    });
});

describe('enhancement extras are wired once', () => {
    it('index.html loads DieScoreContribution before ScoringEngine', () => {
        const html = readFileSync('game/index.html', 'utf8');
        expect(html.indexOf('DieScoreContribution.js')).toBeGreaterThan(-1);
        expect(html.indexOf('DieScoreContribution.js')).toBeLessThan(html.indexOf('ScoringEngine.js'));
        expect(html.indexOf('DieScoreContribution.js')).toBeLessThan(html.indexOf('ScoringAnimation.js'));
        expect(html.indexOf('DieScoreContribution.js')).toBeLessThan(html.indexOf('DiceRenderer.js'));
    });

    it('engine, animation, and hover call the helper instead of copying iron/mirror math', () => {
        const engine = readFileSync('game/js/engine/ScoringEngine.js', 'utf8');
        const anim = readFileSync('game/js/ui/ScoringAnimation.js', 'utf8');
        const hover = readFileSync('game/js/ui/renderers/DiceRenderer.js', 'utf8');
        expect(engine).toContain('DieScoreContribution.scoredEnhancementPips');
        expect(engine).toContain('DieScoreContribution.blessedFavour');
        expect(engine).not.toContain("hasEnhancementForCurrentFace('iron')");
        expect(anim).toContain('DieScoreContribution.preview');
        expect(anim).not.toContain('ENHANCEMENT_BONUSES.IRON_PIPS');
        expect(hover).toContain('DieScoreContribution.preview');
        expect(hover).not.toContain('ENHANCEMENT_BONUSES.IRON_PIPS');
    });

    it('parchment fortune is resolved once and replayed by the animation', () => {
        const engine = readFileSync('game/js/game/GameEngine.js', 'utf8');
        const anim = readFileSync('game/js/ui/ScoringAnimation.js', 'utf8');
        expect(engine).toContain('DieScoreContribution.resolveParchment');
        expect(engine).toContain('this.lastParchmentFortunes = parchmentFortunes');
        expect(engine).not.toContain('parchmentRoll');
        expect(anim).toContain('lastParchmentFortunes');
        expect(anim).not.toContain('parchmentRoll');
        expect(anim).not.toContain('ENHANCEMENT_CHANCES.PARCHMENT');
    });

    it('DiceRenderer uses the injected engine', () => {
        const hover = readFileSync('game/js/ui/renderers/DiceRenderer.js', 'utf8');
        expect(hover).toContain('this._game = gameEngine');
    });
});
