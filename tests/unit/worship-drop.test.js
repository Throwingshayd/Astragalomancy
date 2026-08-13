import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';

/**
 * Dragging a Worship card straight off the shop shelf onto its god's tablet buys
 * and consecrates it in one motion. The card must never touch a Libation slot,
 * and a refused offering must never cost gold.
 */

class FakeChip {
    constructor(category, rect) {
        this.category = category;
        this.rect = rect;
        this.classes = new Set();
        this.classList = {
            add: (...names) => names.forEach((n) => this.classes.add(n)),
            remove: (...names) => names.forEach((n) => this.classes.delete(n)),
            contains: (n) => this.classes.has(n),
        };
    }

    getAttribute(name) {
        return name === 'data-category' ? this.category : null;
    }

    getBoundingClientRect() {
        return this.rect;
    }
}

const rect = (left, top) => ({ left, top, right: left + 100, bottom: top + 50 });

let chips = [];

class FakeWorshipCard {
    constructor(props) {
        Object.assign(this, { id: 'w1', name: 'Hymn to Hera', uses: 1, cost: 4 }, props);
        this.applied = null;
    }

    canUse() {
        return this.uses > 0;
    }

    applyWorship(state) {
        if (this.refuse) return false;
        this.applied = { kind: 'worship', state };
        this.uses -= 1;
        return true;
    }

    applyAscendedConsecration(state, category) {
        if (this.refuse) return false;
        this.applied = { kind: 'consecration', category };
        this.uses -= 1;
        return true;
    }
}

const makeShop = () => ({
    getShopPrice: (cost) => cost,
    hasTantalusSpendBlock: () => false,
    ensureCanAfford: (state, cost, engine, message) => {
        if (state.gold >= cost) return true;
        engine.messages.push(message);
        return false;
    },
    _getActivePackContainer: () => null,
    _finalizePackClaim: () => {},
});

const makeEngine = (state) => ({
    messages: [],
    goldDeltas: [],
    updatedUI: 0,
    showMessage(m) { this.messages.push(m); },
    updateGoldAnimated(delta) { this.goldDeltas.push(delta); state.gold += delta; },
    updateAllUI() { this.updatedUI += 1; },
});

describe('WorshipDrop', () => {
    beforeAll(() => {
        globalThis.WorshipCard = FakeWorshipCard;
        globalThis.document = {
            querySelectorAll: () => chips,
        };
        const src = readFileSync('game/js/ui/drag/WorshipDrop.js', 'utf8')
            .replace("if (typeof window !== 'undefined') window.WorshipDrop = WorshipDrop;",
                'globalThis.WorshipDrop = WorshipDrop;');
        // eslint-disable-next-line no-eval
        eval(src);
    });

    beforeEach(() => {
        chips = [
            new FakeChip('Twos', rect(0, 0)),
            new FakeChip('Sevens', rect(200, 0)),
            new FakeChip('Yahtzee', rect(400, 0)),
        ];
        globalThis.BlindDirector = { blocksWorship: () => false };
    });

    const state = (over = {}) => ({
        gold: 10, consumables: [], unlockedCategories: {}, ...over,
    });

    it('a card may only be offered to its own god, unless it has ascended', () => {
        const W = globalThis.WorshipDrop;
        const card = new FakeWorshipCard({ category: 'Twos' });
        expect(W.matches(card, 'Twos', state())).toBe(true);
        expect(W.matches(card, 'Yahtzee', state())).toBe(false);

        const ascended = new FakeWorshipCard({ category: 'Twos', devotionAscended: true });
        expect(W.matches(ascended, 'Yahtzee', state())).toBe(true);
    });

    it('locked rows refuse worship until the category is unlocked', () => {
        const W = globalThis.WorshipDrop;
        const card = new FakeWorshipCard({ category: 'Sevens' });
        expect(W.matches(card, 'Sevens', state())).toBe(false);
        expect(W.matches(card, 'Sevens', state({ unlockedCategories: { Sevens: true } }))).toBe(true);
    });

    it('only the matching tablet lights up as a target', () => {
        const W = globalThis.WorshipDrop;
        W.markTargets(new FakeWorshipCard({ category: 'Twos' }), state());
        expect(chips.filter((c) => c.classes.has('pantheon-worship-target')).map((c) => c.category))
            .toEqual(['Twos']);
        W.clearTargets();
        expect(chips.some((c) => c.classes.size > 0)).toBe(false);
    });

    it('buys and consecrates on drop without ever using a consumable slot', () => {
        const W = globalThis.WorshipDrop;
        const s = state({ gold: 10 });
        const engine = makeEngine(s);
        const card = new FakeWorshipCard({ category: 'Twos', cost: 4 });
        const ctx = { mode: 'direct', card, gameState: s, gameEngine: engine };

        const handled = W.tryShopDrop(makeShop(), ctx, 10, 10, null);

        expect(handled).toBe(true);
        expect(card.applied.kind).toBe('worship');
        expect(s.gold).toBe(6);
        expect(s.consumables).toEqual([]);
        expect(engine.updatedUI).toBe(1);
    });

    it('leaves the drop to the shop when the pointer is off the pantheon', () => {
        const W = globalThis.WorshipDrop;
        const s = state();
        const card = new FakeWorshipCard({ category: 'Twos' });
        const ctx = { mode: 'direct', card, gameState: s, gameEngine: makeEngine(s) };

        expect(W.tryShopDrop(makeShop(), ctx, 900, 900, null)).toBe(false);
        expect(card.applied).toBe(null);
        expect(s.gold).toBe(10);
    });

    it('an offering you cannot afford costs nothing and is not applied', () => {
        const W = globalThis.WorshipDrop;
        const s = state({ gold: 1 });
        const engine = makeEngine(s);
        const card = new FakeWorshipCard({ category: 'Twos', cost: 4 });
        const ctx = { mode: 'direct', card, gameState: s, gameEngine: engine };

        expect(W.tryShopDrop(makeShop(), ctx, 10, 10, null)).toBe(true);
        expect(card.applied).toBe(null);
        expect(s.gold).toBe(1);
        expect(engine.messages).toContain('Not enough gold!');
    });

    it('a refused offering is not charged for', () => {
        const W = globalThis.WorshipDrop;
        const s = state({ gold: 10 });
        const engine = makeEngine(s);
        const card = new FakeWorshipCard({ category: 'Twos', cost: 4, refuse: true });

        W.tryShopDrop(makeShop(), { mode: 'direct', card, gameState: s, gameEngine: engine }, 10, 10, null);

        expect(s.gold).toBe(10);
        expect(engine.goldDeltas).toEqual([]);
    });

    it('Sacred Silence blocks the shop shelf too, and takes no gold', () => {
        const W = globalThis.WorshipDrop;
        globalThis.BlindDirector = { blocksWorship: () => true };
        const s = state({ gold: 10 });
        const engine = makeEngine(s);
        const card = new FakeWorshipCard({ category: 'Twos', cost: 4 });

        expect(W.tryShopDrop(makeShop(), { mode: 'direct', card, gameState: s, gameEngine: engine }, 10, 10, null))
            .toBe(true);
        expect(card.applied).toBe(null);
        expect(s.gold).toBe(10);
        expect(engine.messages[0]).toMatch(/Sacred Silence/);
        expect(W.markTargets(card, s)).toBe(undefined);
        expect(chips.some((c) => c.classes.has('pantheon-worship-target'))).toBe(false);
    });

    it('a card revealed from a pack is already paid for', () => {
        const W = globalThis.WorshipDrop;
        const s = state({ gold: 10 });
        const engine = makeEngine(s);
        const card = new FakeWorshipCard({ category: 'Twos', cost: 4 });

        W.tryShopDrop(makeShop(), { mode: 'packReveal', card, gameState: s, gameEngine: engine }, 10, 10, null);

        expect(card.applied.kind).toBe('worship');
        expect(s.gold).toBe(10);
    });

    it('both drags read the same rules, and the shop drag is wired to them', () => {
        const shop = readFileSync('game/js/ui/ShopUI.js', 'utf8');
        const consumable = readFileSync('game/js/ui/drag/ConsumableDrag.js', 'utf8');
        const html = readFileSync('game/index.html', 'utf8');

        expect(html).toContain('js/ui/drag/WorshipDrop.js');
        expect(shop).toContain('WorshipDrop.tryShopDrop(this, ctx, px, py, st.el)');
        expect(shop).toContain('WorshipDrop.markTargets');
        // The owned-card drag must not keep a second copy of the matching rules.
        expect(consumable).toContain('WorshipDrop.matches(card, category, state)');
        expect(consumable).not.toMatch(/const worshipMatchesCategory = \(card, category, state\) => \{/);
    });

    it('an ascended card consecrates the row it was dropped on', () => {
        const W = globalThis.WorshipDrop;
        const s = state({ gold: 10 });
        const engine = makeEngine(s);
        const card = new FakeWorshipCard({ category: 'Twos', cost: 4, devotionAscended: true });

        W.tryShopDrop(makeShop(), { mode: 'direct', card, gameState: s, gameEngine: engine }, 410, 10, null);

        expect(card.applied).toEqual({ kind: 'consecration', category: 'Yahtzee' });
    });
});
