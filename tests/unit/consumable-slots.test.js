import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * Blessings and libations were one shared five-slot pool, so a full hand of
 * libations locked you out of buying worship. They now hold separate rails.
 * These lock the split in: the counts, the typing, and the fact that the shop
 * and the ritual-knife reward ask the rail rather than the combined array.
 */
const worship = (id) => ({ id, type: 'worship' });
const libation = (id) => ({ id, type: 'libation' });

describe('ConsumableSlots — blessings and libations hold separate rails', () => {
    let state;
    let ConsumableSlots;

    beforeAll(() => {
        globalThis.GAME_BALANCE = { STARTING_WORSHIP_SLOTS: 2, STARTING_LIBATION_SLOTS: 3 };
        const src = readFileSync('game/js/game/ConsumableSlots.js', 'utf8')
            .replace("if (typeof window !== 'undefined') window.ConsumableSlots = ConsumableSlots;", 'globalThis.ConsumableSlots = ConsumableSlots;');
        // eslint-disable-next-line no-eval
        eval(src);
        ConsumableSlots = globalThis.ConsumableSlots;
    });

    beforeEach(() => {
        state = { consumables: [], worshipSlots: 2, libationSlots: 3 };
    });

    it('starts at two blessing slots and three libation slots', () => {
        const constants = readFileSync('game/js/config/GameConstants.js', 'utf8');
        expect(constants).toContain('STARTING_WORSHIP_SLOTS: 2');
        expect(constants).toContain('STARTING_LIBATION_SLOTS: 3');
    });

    it('sorts cards to their own rail', () => {
        state.consumables = [worship('a'), libation('b'), worship('c')];
        expect(ConsumableSlots.held(state, 'worship').map((c) => c.id)).toEqual(['a', 'c']);
        expect(ConsumableSlots.held(state, 'libation').map((c) => c.id)).toEqual(['b']);
    });

    it('a full libation rail leaves room for a blessing', () => {
        state.consumables = [libation('a'), libation('b'), libation('c')];
        expect(ConsumableSlots.hasRoom(state, 'libation')).toBe(false);
        expect(ConsumableSlots.isFull(state, libation('d'))).toBe(true);
        expect(ConsumableSlots.isFull(state, worship('e'))).toBe(false);
    });

    it('a full blessing rail leaves room for a libation', () => {
        state.consumables = [worship('a'), worship('b')];
        expect(ConsumableSlots.isFull(state, worship('c'))).toBe(true);
        expect(ConsumableSlots.isFull(state, libation('d'))).toBe(false);
    });

    it('offers only same-kind cards when a rail overflows into expulsion', () => {
        state.consumables = [worship('a'), libation('b'), worship('c')];
        expect(ConsumableSlots.sameKindAs(state, worship('d')).map((c) => c.id)).toEqual(['a', 'c']);
        expect(ConsumableSlots.sameKindAs(state, libation('d')).map((c) => c.id)).toEqual(['b']);
    });

    it('falls back to the starting capacities when state predates the split', () => {
        const legacy = { consumables: [] };
        expect(ConsumableSlots.capacity(legacy, 'worship')).toBe(2);
        expect(ConsumableSlots.capacity(legacy, 'libation')).toBe(3);
    });

    it('ignores anything that is not a consumable', () => {
        expect(ConsumableSlots.kindOf({ id: 'midas_touch', type: 'boon' })).toBe(null);
        expect(ConsumableSlots.isFull(state, { type: 'boon' })).toBe(false);
    });
});

describe('the split is wired into the shop and the engine', () => {
    it('shop capacity and expulsion ask the rail, not the combined array', () => {
        const shop = readFileSync('game/js/ui/ShopUI.js', 'utf8');
        expect(shop).toContain('ConsumableSlots.isFull(gameState, card)');
        expect(shop).toContain('ConsumableSlots.sameKindAs(gameState, card)');
        expect(shop).not.toContain('gameState.consumables.length >= gameState.consumableSlots');
    });

    it('artifact effects no longer steal slots from the other rail', () => {
        const effects = readFileSync('game/js/game/ArtifactEffects.js', 'utf8');
        // Pack artifacts change pack size, not rail width. Slot totals stay the
        // GAME_BALANCE baseline, and consumableSlots remains their sum.
        expect(effects).not.toMatch(/d\.libationSlots \+= /);
        expect(effects).not.toMatch(/d\.worshipSlots \+= /);
        expect(effects).toContain('state.consumableSlots = d.worshipSlots + d.libationSlots;');
    });

    it('each rail renders only its own kind and counts itself', () => {
        const renderer = readFileSync('game/js/ui/renderers/PlayAreaRenderer.js', 'utf8');
        expect(renderer).toContain("this.renderConsumableRail(dom.worshipSlots, gameState, 'worship'");
        expect(renderer).toContain("this.renderConsumableRail(dom.libationSlots, gameState, 'libation'");
        expect(renderer).toContain('ConsumableSlots.held(gameState, kind)');
    });

    it('the libation rail is its own element, positioned from tokens', () => {
        const html = readFileSync('game/index.html', 'utf8');
        const styles = readFileSync('game/css/styles.css', 'utf8');
        const theme = readFileSync('game/css/greek-theme.css', 'utf8');

        expect(html).toContain('id="libationRail"');
        expect(html).toContain('id="libationSlots"');
        expect(html).toContain('id="worshipSlots"');
        expect(html).toContain('js/game/ConsumableSlots.js');
        expect(styles).toMatch(
            /\.libation-rail\.inventory-panel-consumables \{[\s\S]*?top: var\(--libation-rail-top/,
        );
        expect(theme).toMatch(/--libation-rail-top:\s*calc\(620px \+ 2 \* var\(--felt-die-size/);
        expect(theme).toMatch(/--blessing-bar-h:\s*\d+px;/);
    });

    it('the shop buy-drag targets the rail the card will actually land in', () => {
        const shop = readFileSync('game/js/ui/ShopUI.js', 'utf8');
        const styles = readFileSync('game/css/styles.css', 'utf8');

        expect(shop).toContain("ConsumableSlots.kindOf(card) === 'libation' ? 'libationRail' : 'leftConsumableBar'");
        // Glow, hot state and the drop commit all resolve through the one helper, so no
        // path can send a libation purchase back to the blessing pillar.
        expect(shop.match(/_inventoryBarFor\(/g)).toHaveLength(4);
        expect(shop).not.toContain("const consumableBar = document.getElementById('leftConsumableBar')");
        expect(styles).toMatch(/#libationRail\.shop-drop-glow \{[\s\S]*?background: linear-gradient/);
    });

    it('drag binds to the rail that owns the card, so both rails reorder', () => {
        const drag = readFileSync('game/js/ui/drag/ConsumableDrag.js', 'utf8');
        expect(drag).toContain("container.closest('.inventory-panel-consumables')");
        expect(drag).not.toContain("document.getElementById('leftConsumableBar')");
    });
});
