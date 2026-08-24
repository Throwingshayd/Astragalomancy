import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Blessing face/tooltip effect is planet-style: Level up {row} plus +Pips & +Favour.
 * Consecration is a quiet tooltip aside, not printed on the card.
 */

function loadExports(path, names) {
    const src = readFileSync(path, 'utf8');
    return Function(`${src}; return { ${names.join(', ')} };`)();
}

const {
    CATEGORY_PIPS_PER_LEVEL,
    WORSHIP_FAVOUR_PER_LEVEL,
} = loadExports('game/js/config/ScoringConstants.js', [
    'CATEGORY_PIPS_PER_LEVEL',
    'WORSHIP_FAVOUR_PER_LEVEL',
]);

const { GOD_METADATA, CARD_ECONOMY } = loadExports('game/js/config/GameConstants.js', [
    'GOD_METADATA',
    'CARD_ECONOMY',
]);

const { PlayerTitles } = loadExports('game/js/config/PlayerTitles.js', ['PlayerTitles']);

const { CardData } = loadExports('game/js/data/gameData.js', ['CardData']);

function expectedEffect(card) {
    const meta = GOD_METADATA[card.god];
    expect(meta, `${card.id} god ${card.god} missing from GOD_METADATA`).toBeTruthy();
    const row = PlayerTitles.display(meta.category);
    if (card.god === "Pandora's Jar") return `Level up ${row}.`;
    const pips = CATEGORY_PIPS_PER_LEVEL[meta.category] || 0;
    const favShown = WORSHIP_FAVOUR_PER_LEVEL / 100;
    if (pips > 0) return `Level up ${row}. +${pips} Pips & +${favShown} Favour.`;
    return `Level up ${row}. +${favShown} Favour.`;
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

    it('says Level up plus simple Pips & Favour', () => {
        expect(CardData.worship.length).toBeGreaterThan(0);
        for (const card of CardData.worship) {
            expect(card.effect, card.id).toBe(expectedEffect(card));
            expect(card.effect, card.id).not.toMatch(/consecrate|Held 3/i);
        }
    });

    it('keeps consecration as a quiet tooltip aside, not face copy', () => {
        const worship = readFileSync('game/js/classes/WorshipCard.js', 'utf8');
        const tooltips = readFileSync('game/js/ui/TooltipContent.js', 'utf8');
        expect(worship).toContain("Hold a Trial to consecrate.");
        expect(worship).toContain('tip.aside');
        expect(tooltips).toContain('tooltip-whisper');
        expect(tooltips).toContain('parsed.aside');
    });
});
