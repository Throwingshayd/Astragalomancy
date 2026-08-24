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
    });

    it('boon pool is crafted lore only (no gambling / Balatro leftovers)', () => {
        expect(CardData.boons).toHaveLength(32);
        const banned = [
            'the_gambler', 'lucky_dice_bag', 'gamblers_charm', 'reckless_abandon',
            'the_locksmith', 'the_merchant', 'first_blood', 'misery', 'the_zealot',
            'mt_olympus', 'cycle_of_seasons', 'prometheus_gift', 'parmenides_die',
        ];
        for (const id of banned) {
            expect(byId(id), id).toBeUndefined();
        }
    });

    it('boon tooltips match handlers', () => {
        expect(byId('proteus_disguise').effect).toBe('Copies the effect of the Boon to its left.');
        expect(byId('medusas_gaze').effect).toContain('+6 Pips per 6');
        expect(byId('nine_muses').effect).toContain('+0.5 Favour');
        expect(byId('silver_bow_of_artemis').effect).toContain('first Cast');
        expect(byId('yoke_of_hera').effect).toContain('The Feast');
        expect(byId('the_lots_of_zeus').effect).toContain('Heureka');
        expect(byId('asphodel_of_hades').effect).toContain('The House');
        expect(byId('trident_of_poseidon').effect).toContain('every 8 times');
        expect(byId('pandoras_jar').name).toBe('Elpis in the Jar');
        expect(byId('pandoras_jar').effect).toContain('+10 Pips');
        expect(byId('trojan_horse').effect).toContain('Favour is ×2');
        expect(byId('cerberus_watch').effect).toContain('watched');
        expect(byId('icarus_wings').effect).toContain('+0.1 Favour');
        expect(byId('lethe_waters').name).toBe('Forgetfulness');
        expect(byId('bellows_of_war').name).toBe('Twenty Bellows');
        expect(byId('typhon').effect).toContain('10 ones');
        expect(byId('the_odyssey').effect).toContain('scratch');
        expect(byId('cornucopia_of_ploutos').name).toBe('Ploutos');
        expect(byId('reflection_of_narcissus').effect).toContain('disabled');
        expect(byId('sisyphus_boulder').effect).toContain('+5 Pips');
        expect(byId('tantalus_curse').effect).toContain('cannot spend');

        expect(readFileSync('game/js/game/NearMissBoonHandlers.js', 'utf8')).toContain("Medusa's Gaze");
        expect(readFileSync('game/js/classes/boonTimingHandlers.js', 'utf8')).toContain('sisyphus');

        const engine = readFileSync('game/js/engine/ScoringEngine.js', 'utf8');
        expect(engine).toContain('SafeMath.safeScore(pips, favour)');
        expect(engine).toContain('favourMultiplier');
    });

    it('artifact copy matches the handlers', () => {
        const art = (id) => {
            for (const pair of Object.values(CardData.artifacts)) {
                if (pair.base?.id === id) return pair.base;
                if (pair.upgraded?.id === id) return pair.upgraded;
            }
            return null;
        };
        expect(art('artifact_telescope').effect).toBe('Double the Favour gained from worship levels.');
        expect(art('artifact_hecatomb').effect).toBe('Selling a Boon pays its full shop cost.');
        expect(art('artifact_sixth_astragalus').effect).toContain('The Jar');
        expect(art('artifact_seventh_astragalus').effect).toContain('Wild');
        expect(art('artifact_pythias_indulgence').effect).toContain('Cast the Bones once');
        expect(art('artifact_tyches_grace').effect).toBe('+4 Gold at the start of each Trial.');
        expect(art('artifact_tyches_bounty').effect).toBe('+8 Gold at the start of each Trial.');

        const handlers = readFileSync('game/js/game/ArtifactEffects.js', 'utf8');
        expect(handlers).toContain('d.boonSellAtCost = true');
        expect(handlers).toContain('d.forceSingleRoll = true');
        expect(handlers).toContain('d.trialGold += 4');
    });

    it('pack stock fallbacks match CARD_ECONOMY pack costs', () => {
        const gen = readFileSync('game/js/engine/ShopStockGenerator.js', 'utf8');
        expect(gen).toContain('WORSHIP_PACK_COST ?? 4');
        expect(gen).toContain('LIBATION_PACK_COST ?? 4');
        expect(CARD_ECONOMY.WORSHIP_PACK_COST).toBe(4);
        expect(CARD_ECONOMY.LIBATION_PACK_COST).toBe(4);
    });

    it('libation scored extras match the engine', () => {
        const libation = readFileSync('game/js/classes/LibationCard.js', 'utf8');
        expect(libation).toContain('+1 Gold when scored');
        expect(libation).toContain('+1 Favour');
        expect(libation).toContain('+0.1 Favour when scored');
    });

    it('enhancement registry lists the faces the engine scores', () => {
        const { EnhancementRegistry } = loadExports(
            'game/js/config/EnhancementRegistry.js',
            ['EnhancementRegistry'],
        );
        expect(Object.keys(EnhancementRegistry._defs).sort()).toEqual([
            'blessed', 'gold', 'iron', 'mirror', 'mother_of_pearl', 'parchment', 'wild',
        ].sort());
    });

    it('scorecard, info bar, worship, card face, and consumable drag no longer reach through window.game', () => {
        const scorecard = readFileSync('game/js/ui/renderers/ScorecardRenderer.js', 'utf8');
        const info = readFileSync('game/js/ui/renderers/InfoBarRenderer.js', 'utf8');
        const worship = readFileSync('game/js/classes/WorshipCard.js', 'utf8');
        const card = readFileSync('game/js/classes/Card.js', 'utf8');
        const drag = readFileSync('game/js/ui/drag/ConsumableDrag.js', 'utf8');
        expect(scorecard).not.toContain('window.game');
        expect(info).not.toContain('window.game');
        expect(worship).not.toContain('window.game');
        expect(card).not.toContain('window.game');
        expect(drag).not.toContain('window.game');
        expect(worship).toContain('applyWorship(gameState, game = null)');
        expect(scorecard).toContain('engine.calculateScore(category)');
        expect(drag).toContain('container._gameEngine');
        expect(card).toContain('render(isShopItem = false, isDirectSale = false, gameState = null)');
    });
});
