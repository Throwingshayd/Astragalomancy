import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8').replace(
        `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
        `globalThis.${exportName} = ${exportName};`,
    );
    eval(src);
}

function die(face, extras = {}) {
    const enhancements = new Set(extras.enhanced ? ['parchment'] : []);
    return {
        face,
        currentFace: face,
        getEffectiveFace: () => face,
        faces: { [face]: { enhancements } },
        hasEnhancementForCurrentFace: (e) => extras.wild && e === 'wild',
    };
}

function boon(id) {
    return {
        id,
        _randomInt: (max) => 0,
        dynamicStats: {},
    };
}

describe('SeatBoonHandlers', () => {
    beforeAll(() => {
        globalThis.window = globalThis;
        globalThis.GAME_BALANCE = { STARTING_ROLLS: 3 };
        globalThis.CATEGORY_TO_NUMBER = {
            Ones: 1, Twos: 2, Threes: 3, Fours: 4, Fives: 5, Sixes: 6,
            Sevens: 7, Eights: 8, Nines: 9,
        };
        globalThis.GOD_TO_CATEGORY = {
            'Three of a Kind': 'Hephaestus',
            'Four of a Kind': 'Ares',
            'Full House': 'Dionysus',
            'Small Straight': 'Hermes',
            'Large Straight': 'Apollo',
            'Extra Long Straight': 'Iris',
            Yahtzee: 'Hades',
            Heureka: 'Zeus',
            Chance: 'Nyx',
        };
        loadScript('game/js/game/SeatBoonHandlers.js', 'SeatBoonHandlers');
    });

    const H = () => globalThis.SeatBoonHandlers;

    it('Artemis pays +15 Pips on Ones after the first Cast only', () => {
        const result = { category: 'Ones', pips: 5, isValid: true };
        H().beforeScore(boon('silver_bow_of_artemis'), {
            rollsLeft: 2,
            dice: [die(1), die(1), die(1), die(1), die(1)],
        }, result, null);
        expect(result.pips).toBe(20);

        const reroll = { category: 'Ones', pips: 5, isValid: true };
        H().beforeScore(boon('silver_bow_of_artemis'), { rollsLeft: 1, dice: [] }, reroll, null);
        expect(reroll.pips).toBe(5);
    });

    it('Aphrodite counts neighbouring 2s in tray order', () => {
        const result = { category: 'Chance', pips: 10, isValid: true };
        H().beforeScore(boon('girdle_of_aphrodite'), {
            dice: [die(2), die(2), die(2), die(5), die(5)],
        }, result, null);
        expect(result.pips).toBe(14);
    });

    it('Hecate pays +9 when three 3s show', () => {
        const result = { category: 'Chance', pips: 0, isValid: true };
        H().beforeScore(boon('triple_torch_of_hecate'), {
            dice: [die(3), die(3), die(3), die(1), die(2)],
        }, result, null);
        expect(result.pips).toBe(9);
    });

    it('Athena pays on Fives only while Sixes is empty', () => {
        const empty = { category: 'Fives', pips: 10, isValid: true };
        H().beforeScore(boon('mist_of_ithaca'), { scorecard: {} }, empty, null);
        expect(empty.pips).toBe(25);

        const filled = { category: 'Fives', pips: 10, isValid: true };
        H().beforeScore(boon('mist_of_ithaca'), { scorecard: { Sixes: 30 } }, filled, null);
        expect(filled.pips).toBe(10);
    });

    it('Persephone splits even Trials to Pips and odd Trials to Gold', () => {
        const even = { category: 'Sixes', pips: 12, isValid: true };
        H().beforeScore(boon('pomegranate_of_persephone'), { ante: 2 }, even, null);
        expect(even.pips).toBe(24);

        const state = { ante: 3, gold: 0 };
        H().afterScore(boon('pomegranate_of_persephone'), state, {
            category: 'Sixes', finalScore: 20,
        }, null);
        expect(state.gold).toBe(6);
    });

    it('Anvil gains +2 Pips when three dice match', () => {
        const card = boon('anvil_of_hephaestus');
        const first = { category: 'Three of a Kind', pips: 10, isValid: true };
        H().beforeScore(card, {
            dice: [die(4), die(4), die(4), die(1), die(2)],
        }, first, null);
        expect(first.pips).toBe(12);
        const second = { category: 'Full House', pips: 10, isValid: true };
        H().beforeScore(card, {
            dice: [die(4), die(4), die(4), die(2), die(2)],
        }, second, null);
        expect(second.pips).toBe(14);
    });

    it('Ares pays Favour before score and Gold after a paid Four of a Kind', () => {
        const before = { category: 'Four of a Kind', favour: 100, isValid: true };
        H().beforeScore(boon('spoils_of_ares'), {}, before, null);
        expect(before.favour).toBe(150);

        const state = { gold: 0 };
        H().afterScore(boon('spoils_of_ares'), state, {
            category: 'Four of a Kind', finalScore: 40,
        }, null);
        expect(state.gold).toBe(4);
    });

    it('Hermes pays Gold on any straight', () => {
        const state = { gold: 1 };
        H().afterScore(boon('caduceus_of_hermes'), state, {
            category: 'Small Straight', finalScore: 30,
        }, null);
        expect(state.gold).toBe(4);
    });

    it('Hades pays +4 Pips per filled row on The House', () => {
        const result = { category: 'Yahtzee', pips: 50, isValid: true };
        H().beforeScore(boon('asphodel_of_hades'), {
            scorecard: { Ones: 3, Twos: 6, Chance: 10 },
        }, result, null);
        expect(result.pips).toBe(62);
    });

    it('Nyx pays +0.1 Favour per different face on Night', () => {
        const result = { category: 'Chance', favour: 100, isValid: true };
        H().beforeScore(boon('veil_of_nyx'), {
            dice: [die(1), die(2), die(3), die(4), die(6)],
        }, result, null);
        expect(result.favour).toBe(150);
    });

    it('Pleiades add ignored 7s to face-row Pips', () => {
        const result = { category: 'Ones', pips: 3, isValid: true };
        H().beforeScore(boon('seven_sisters'), {
            dice: [die(1), die(1), die(1), die(4), die(7)],
        }, result, null);
        expect(result.pips).toBe(10);
    });

    it('Poseidon gains Favour every 8 paid scores', () => {
        const card = boon('trident_of_poseidon');
        const state = { scoresThisRun: 7 };
        H().afterScore(card, state, { category: 'Chance', finalScore: 10 }, null);
        expect(state.scoresThisRun).toBe(8);
        expect(card.tideFavour).toBe(10);
    });

    it('Muses pay when all five dice are enhanced', () => {
        const yes = { category: 'Nines', favour: 100, isValid: true };
        H().beforeScore(boon('nine_muses'), {
            dice: [die(2, { enhanced: true }), die(3, { enhanced: true }), die(4, { enhanced: true }),
                die(5, { enhanced: true }), die(6, { enhanced: true })],
        }, yes, null);
        expect(yes.favour).toBe(150);

        const no = { category: 'Nines', favour: 100, isValid: true };
        H().beforeScore(boon('nine_muses'), {
            dice: [die(2, { enhanced: true }), die(3), die(4), die(5), die(6)],
        }, no, null);
        expect(no.favour).toBe(100);
    });

    it('Zeus lots raise Heureka, The House, and unlocked Eights', () => {
        const state = { worshipLevels: { Zeus: 0, Hades: 0, Poseidon: 0 }, unlockedCategories: { Eights: true } };
        H().afterScore(boon('the_lots_of_zeus'), state, { category: 'Heureka', finalScore: 80 }, null);
        expect(state.worshipLevels.Zeus).toBe(1);
        expect(state.worshipLevels.Hades).toBe(1);
        expect(state.worshipLevels.Poseidon).toBe(1);
    });
});

describe('seat boon art', () => {
    const dedicated = [
        'girdle_of_aphrodite', 'triple_torch_of_hecate', 'yoke_of_hera', 'mist_of_ithaca',
        'spoils_of_ares', 'caduceus_of_hermes', 'pythian_course', 'spectrum_of_iris',
        'asphodel_of_hades', 'the_lots_of_zeus', 'veil_of_nyx', 'seven_sisters',
        'nine_muses', 'trident_of_poseidon',
    ];

    it('maps first-wave seats to their own portraits', () => {
        const mapping = readFileSync('game/js/data/assetMapping.js', 'utf8');
        for (const id of dedicated) {
            const file = `${id.replace(/_/g, ' ')}.png`;
            expect(mapping, id).toContain(`'${id}': '${file}'`);
            expect(existsSync(path.join('game', 'public', 'ART', file)), file).toBe(true);
        }
    });
});
