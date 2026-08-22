import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Continuity regulator: player-facing copy, shop pathing, and economy constants
 * must match what the engine actually does. This is the failing-test version of
 * "the tooltip lied again."
 */

function loadExports(path, names) {
    const src = readFileSync(path, 'utf8');
    return Function(`${src}; return { ${names.join(', ')} };`)();
}

const { CARD_ECONOMY } = loadExports('game/js/config/GameConstants.js', ['CARD_ECONOMY']);
const { CardData } = loadExports('game/js/data/gameData.js', ['CardData']);
const { Card } = loadExports('game/js/classes/Card.js', ['Card']);

const byId = (id) => CardData.boons.find((c) => c.id === id);

describe('continuity regulator', () => {
    it('shop: Cast the Bones Continues, marble plaque Rerolls', () => {
        const html = readFileSync('game/index.html', 'utf8');
        const shopUi = readFileSync('game/js/ui/ShopUI.js', 'utf8');
        const engine = readFileSync('game/js/game/GameEngine.js', 'utf8');

        expect(html).toMatch(/id="shopContinueBtn"[\s\S]*?Reroll/);
        expect(html).toContain('shop-continue-label">Reroll');
        expect(html).toContain('Cast the Bones in play / Continue in shop');
        expect(html).toContain('Blessing / Libation');

        expect(shopUi).toContain("rollBtn.textContent = shopOpen ? 'Continue' : 'Cast the Bones'");
        expect(shopUi).toContain("label.textContent = 'Reroll'");
        expect(shopUi).toContain('engine.rerollShop()');
        expect(engine).toMatch(/if \(shopOpen\) this\.closeShop\(\)/);
        expect(engine).toContain('this.rerollShop()');
    });

    it('artifact shop price is 10g in data and CARD_ECONOMY', () => {
        expect(CARD_ECONOMY.ARTIFACT_BASE_COST).toBe(10);
        const artifacts = Object.values(CardData.artifacts).map((pair) => pair.base);
        expect(artifacts.length).toBeGreaterThan(0);
        for (const art of artifacts) {
            expect(art.cost, art.id).toBe(CARD_ECONOMY.ARTIFACT_BASE_COST);
        }
    });

    it('sell value is 25% of cost (min 1) and honours explicit 0', () => {
        expect(CARD_ECONOMY.SELL_VALUE_PERCENTAGE).toBe(0.25);
        expect(Card.defaultSellValue(8)).toBe(2);
        expect(Card.defaultSellValue(3)).toBe(1);
        expect(new Card({ id: 'x', name: 'X', cost: 8 }).sellValue).toBe(2);
        expect(new Card({ id: 'y', name: 'Y', cost: 3, sellValue: 0 }).sellValue).toBe(0);
        expect(new Card({ id: 'z', name: 'Z', cost: 5, sellValue: 1 }).sellValue).toBe(1);
        const cardJs = readFileSync('game/js/classes/Card.js', 'utf8');
        expect(cardJs).toContain('data.sellValue ?? Card.defaultSellValue');
        expect(cardJs).not.toContain('cost * 0.75');
    });

    it('boon tooltips match handlers (no leftover Chips / ×2 / Blueprint)', () => {
        expect(byId('the_gambler').effect).toBe('+10 Pips for every re-roll remaining.');
        expect(byId('misery').effect).toBe('If you have 0 gold, gain +2 Favour.');
        expect(byId('the_zealot').effect).toBe(
            'When you score the pantheon row of the god you most recently Offered to this Trial, gain +1 Favour.',
        );
        expect(byId('mt_olympus').effect).toBe(
            'Gain +1 Favour per total worship level across the pantheon.',
        );
        expect(byId('forge_of_hephaestus').effect).toBe(
            'Gain +0.5 Favour for each unused re-roll (max +1.5).',
        );
        expect(byId('proteus_disguise').effect).toBe('Copies the effect of the Boon to its left.');

        const effects = CardData.boons.map((c) => c.effect).join('\n');
        expect(effects).not.toMatch(/\bChips\b/);
        expect(effects).not.toContain('Blueprint');
        const handlers = readFileSync('game/js/classes/boonTimingHandlers.js', 'utf8');
        expect(handlers).toContain('result.pips += gamblerBonus');
        expect(handlers).toContain('result.favour += 200');
        expect(handlers).toContain('The Zealot: +1 Favour');
        expect(handlers).not.toContain('The Zealot: +×1');
        expect(handlers).not.toContain('favourMult');
        expect(handlers).toContain('result.favour *= 2.5');
        expect(handlers).toContain("Hydra's Heads: +3 Favour");
        expect(handlers).toContain("Medusa's Gaze: +0.5 Favour");
        expect(handlers).not.toMatch(/\+×/);

        const engine = readFileSync('game/js/engine/ScoringEngine.js', 'utf8');
        expect(engine).not.toContain('favourMult');
        expect(engine).toContain('SafeMath.safeScore(pips, favour)');

        expect(byId('eruption_of_etna').effect).toBe(
            "If 3+ Boons trigger on same turn, +1 Favour (stacks, doesn't reset).",
        );
        expect(byId('ascetics_vow').effect).toBe(
            'If you have empty other Boon slots, gain +1 Favour for each.',
        );
        expect(byId('medusas_gaze').effect).toContain('+0.5 Favour');
        expect(byId('pegasus_flight').effect).toContain('+0.5 Favour');
        expect(byId('carillon_of_the_muses').effect).toContain('×2.5 Favour');
        expect(effects).not.toMatch(/\+×/);
    });

    it('redesigned artifact copy matches the handlers', () => {
        const art = (id) => {
            for (const pair of Object.values(CardData.artifacts)) {
                if (pair.base?.id === id) return pair.base;
                if (pair.upgraded?.id === id) return pair.upgraded;
            }
            return null;
        };
        expect(art('artifact_telescope').effect).toBe('Double the Favour gained from worship levels.');
        expect(art('artifact_hecatomb').effect).toBe('Selling a Boon pays its full shop cost.');
        expect(art('artifact_seventh_astragalus').effect).toContain('Wild');
        expect(art('artifact_pythias_indulgence').effect).toContain('Cast the Bones once');
        expect(art('artifact_tyches_grace').effect).toBe('+4 Gold at the start of each Trial.');
        expect(art('artifact_tyches_bounty').effect).toBe('+8 Gold at the start of each Trial.');

        const handlers = readFileSync('game/js/game/ArtifactEffects.js', 'utf8');
        expect(handlers).toContain('d.boonSellAtCost = true');
        expect(handlers).toContain('d.forceSingleRoll = true');
        expect(handlers).toContain('d.trialGold += 4');
        expect(handlers).not.toContain('d.extraRolls += 1');
        expect(handlers).not.toContain('d.extraRolls += 2');
    });

    it('pack stock fallbacks match CARD_ECONOMY pack costs', () => {
        const gen = readFileSync('game/js/engine/ShopStockGenerator.js', 'utf8');
        expect(gen).toContain('WORSHIP_PACK_COST ?? 4');
        expect(gen).toContain('LIBATION_PACK_COST ?? 4');
        expect(CARD_ECONOMY.WORSHIP_PACK_COST).toBe(4);
        expect(CARD_ECONOMY.LIBATION_PACK_COST).toBe(4);
    });

    it('libation cards do not revive Balatro enhancement numbers', () => {
        const libation = readFileSync('game/js/classes/LibationCard.js', 'utf8');
        expect(libation).not.toContain('+3 Gold when scored');
        expect(libation).not.toContain('x1.5 Favour if not selected');
        expect(libation).not.toContain('+1 Pip when scored');
        expect(libation).toContain('+1 Gold when scored');
        expect(libation).toContain('+1 Favour');
        expect(libation).not.toContain('window.game');
        expect(libation).not.toContain('getAllLibationCards');
        expect(libation).not.toContain('createGodSelectionUI');
        expect(libation).not.toContain('wild_dice');
        expect(libation).not.toContain('bonus_yahtzee');
    });

    it('enhancement registry only lists faces the engine actually scores', () => {
        const { EnhancementRegistry } = loadExports(
            'game/js/config/EnhancementRegistry.js',
            ['EnhancementRegistry'],
        );
        expect(Object.keys(EnhancementRegistry._defs).sort()).toEqual([
            'gold', 'iron', 'mirror', 'mother_of_pearl', 'parchment', 'wild',
        ].sort());
        const css = readFileSync('game/css/balatro-effects.css', 'utf8');
        expect(css).not.toContain('cw-tex-lucky');
        expect(css).not.toContain('cw-tex-cursed');
        expect(css).not.toContain('cw-tex-divine');
        expect(css).not.toContain('cw-tex-chaos');
    });

    it('scorecard, info bar, worship, and consumable drag no longer reach through window.game', () => {
        const scorecard = readFileSync('game/js/ui/renderers/ScorecardRenderer.js', 'utf8');
        const info = readFileSync('game/js/ui/renderers/InfoBarRenderer.js', 'utf8');
        const worship = readFileSync('game/js/classes/WorshipCard.js', 'utf8');
        const drag = readFileSync('game/js/ui/drag/ConsumableDrag.js', 'utf8');
        expect(scorecard).not.toContain('window.game');
        expect(info).not.toContain('window.game');
        expect(worship).not.toContain('window.game');
        expect(drag).not.toContain('window.game');
        expect(worship).toContain('applyWorship(gameState, game = null)');
        expect(scorecard).toContain('engine.calculateScore(category)');
        expect(drag).toContain('container._gameEngine');
    });
});
