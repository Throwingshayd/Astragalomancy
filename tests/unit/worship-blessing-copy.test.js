import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Blessing tooltips are hardcoded `effect` strings. Mechanics are shared:
 * Offer = pantheon level-up, Held 3 trials → Ascended. No held gold.
 * This test generates the expected blurb from scoring/god constants so copy
 * cannot advertise a gold payout that the engine no longer pays.
 */

function loadExports(path, names) {
    const src = readFileSync(path, 'utf8');
    return Function(`${src}; return { ${names.join(', ')} };`)();
}

const {
    CATEGORY_PIPS_PER_LEVEL,
    WORSHIP_FAVOUR_PER_LEVEL,
    DEVOTION_TRIALS_TO_ASCEND,
} = loadExports('game/js/config/ScoringConstants.js', [
    'CATEGORY_PIPS_PER_LEVEL',
    'WORSHIP_FAVOUR_PER_LEVEL',
    'DEVOTION_TRIALS_TO_ASCEND',
]);

const { GOD_METADATA, CARD_ECONOMY } = loadExports('game/js/config/GameConstants.js', [
    'GOD_METADATA',
    'CARD_ECONOMY',
]);

const { CardData } = loadExports('game/js/data/gameData.js', ['CardData']);

function displayCategory(category) {
    return category === 'Yahtzee' ? 'Heureka' : category;
}

function offerLine(god, category) {
    const row = displayCategory(category);
    if (god === "Pandora's Box") {
        return `Offer on ${row}: +1 sanctum bonus level`;
    }
    const pips = CATEGORY_PIPS_PER_LEVEL[category] || 0;
    if (pips > 0) {
        return `Offer on ${row}: +1 level (+${pips} pips & +${WORSHIP_FAVOUR_PER_LEVEL} Favour per level)`;
    }
    return `Offer on ${row}: +1 level (+${WORSHIP_FAVOUR_PER_LEVEL} Favour per level)`;
}

function heldLine(god, category) {
    const row = displayCategory(category);
    const as = row === god ? row : `${row}/${god}`;
    return `Held ${DEVOTION_TRIALS_TO_ASCEND} trials → Ascended (consecrate any row as ${as}).`;
}

function expectedEffect(card) {
    const meta = GOD_METADATA[card.god];
    expect(meta, `${card.id} god ${card.god} missing from GOD_METADATA`).toBeTruthy();
    const category = meta.category;
    return `${offerLine(card.god, category)}. ${heldLine(card.god, category)}`;
}

describe('blessing tooltip copy matches shared devotion package', () => {
    it('lists one blessing per god in GOD_METADATA', () => {
        const gods = CardData.worship.map((card) => card.god);
        expect(gods.sort()).toEqual(Object.keys(GOD_METADATA).sort());
    });

    it('keeps every blessing on the shared worship cost', () => {
        for (const card of CardData.worship) {
            expect(card.cost, card.id).toBe(CARD_ECONOMY.WORSHIP_CARD_COST);
        }
    });

    it('documents Offer pips/favour plus Held Ascended, never held gold', () => {
        expect(CardData.worship.length).toBeGreaterThan(0);
        for (const card of CardData.worship) {
            expect(card.effect, card.id).toBe(expectedEffect(card));
            expect(card.effect.toLowerCase()).not.toContain('gold');
        }
    });

    it('does not pay gold for held worship', () => {
        const scoring = readFileSync('game/js/config/ScoringConstants.js', 'utf8');
        const worship = readFileSync('game/js/classes/WorshipCard.js', 'utf8');
        const engine = readFileSync('game/js/game/GameEngine.js', 'utf8');
        expect(scoring).not.toContain('WORSHIP_HELD_GOLD_PER_SCORE');
        expect(worship).not.toContain('applyHeldDevotionGold');
        expect(engine).not.toContain('applyHeldDevotionGold');
    });
});
