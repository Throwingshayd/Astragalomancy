/**
 * WorshipDrop — where a Worship card may land on the pantheon, and what happens
 * when it lands there.
 *
 * Two drags share these rules: an owned card leaving the Libation column
 * (ConsumableDrag) and one dragged straight off the shop shelf (ShopUI). The
 * shop drag buys and consecrates in a single motion, so the card never occupies
 * a consumable slot.
 *
 * @module WorshipDrop
 */

const WorshipDrop = {
    TARGET_CLASS: 'pantheon-worship-target',
    HOT_CLASS: 'pantheon-worship-drag-hot',
    /** Chips are small; forgive a near miss by this many px on each edge. */
    CATCH_PAD: 16,

    isWorship(card) {
        return typeof WorshipCard !== 'undefined' && card instanceof WorshipCard;
    },

    /** Sevens–Nines, Heureka, and The Spectrum wait for The Jar. The Jar itself always accepts Offer. */
    categoryUnlocked(category, state) {
        if (!category || !state) return false;
        if (category === "Pandora's Jar") return true;
        if (category === 'Sevens' || category === 'Eights' || category === 'Nines'
            || category === 'Heureka' || category === 'Extra Long Straight') {
            return !!state.unlockedCategories?.[category];
        }
        return true;
    },

    cardCategory(card) {
        if (!card) return null;
        if (card.category) return card.category;
        if (card.god && typeof GodUtils !== 'undefined') return GodUtils.getCategory(card.god);
        return null;
    },

    /** Ascended cards consecrate any unlocked row; the rest only their own god's. */
    matches(card, category, state) {
        if (card?.devotionAscended && category && this.categoryUnlocked(category, state)) return true;
        const cardCat = this.cardCategory(card);
        return !!cardCat && cardCat === category && this.categoryUnlocked(category, state);
    },

    blocked(state) {
        return typeof BlindDirector !== 'undefined' && BlindDirector.blocksWorship(state);
    },

    chips() {
        return document.querySelectorAll('#scorecard .pantheon-chip');
    },

    /** Light up every row this card could be offered to. */
    markTargets(card, state) {
        this.clearTargets();
        if (!this.isWorship(card) || this.blocked(state) || !card.canUse?.()) return;
        this.chips().forEach((chip) => {
            if (this.matches(card, chip.getAttribute('data-category'), state)) {
                chip.classList.add(this.TARGET_CLASS);
            }
        });
    },

    clearTargets() {
        document.querySelectorAll(`.${this.TARGET_CLASS}, .${this.HOT_CLASS}`).forEach((chip) => {
            chip.classList.remove(this.TARGET_CLASS, this.HOT_CLASS);
        });
    },

    chipUnder(px, py, card, state, ignoreEl) {
        const pad = this.CATCH_PAD;
        for (const chip of this.chips()) {
            if (ignoreEl && (chip === ignoreEl || ignoreEl.contains?.(chip))) continue;
            if (!this.matches(card, chip.getAttribute('data-category'), state)) continue;
            const r = chip.getBoundingClientRect();
            if (px >= r.left - pad && px <= r.right + pad && py >= r.top - pad && py <= r.bottom + pad) {
                return chip;
            }
        }
        return null;
    },

    setHot(chip) {
        this.chips().forEach((c) => {
            if (c !== chip) c.classList.remove(this.HOT_CLASS);
        });
        chip?.classList.add(this.HOT_CLASS);
    },

    /** Called each drag frame so the row under the pointer reads as armed. */
    updateHot(ctx, px, py, ignoreEl) {
        if (!this.isWorship(ctx?.card)) return;
        this.setHot(this.chipUnder(px, py, ctx.card, ctx.gameState, ignoreEl));
    },

    flash(chip) {
        if (!chip) return;
        chip.classList.add('worship-drag-applied-flash');
        setTimeout(() => chip.classList.remove('worship-drag-applied-flash'), 450);
    },

    /**
     * Shop shelf → pantheon: pay for the card and consecrate it without it ever
     * reaching the Libation column.
     *
     * @returns {boolean} true when the drop belonged to us — applied or refused —
     *   so the caller stops looking for other drop targets.
     */
    tryShopDrop(shop, ctx, px, py, el) {
        const card = ctx?.card;
        const state = ctx?.gameState;
        const engine = ctx?.gameEngine;
        if (!shop || !state || !this.isWorship(card)) return false;
        if (ctx.mode !== 'direct' && ctx.mode !== 'packReveal') return false;
        const chip = this.chipUnder(px, py, card, state, el);
        if (!chip) return false;

        if (this.blocked(state)) {
            engine?.showMessage?.('Sacred Silence: Worship cannot be used this trial.');
            return true;
        }
        if (!card.canUse?.()) {
            engine?.showMessage?.('That worship cannot be offered right now.');
            return true;
        }

        // Pack cards are already paid for; only shelf wares cost gold here.
        const paid = ctx.mode === 'direct';
        const cost = paid ? shop.getShopPrice(card.baseCost ?? card.cost, state) : 0;
        if (paid) {
            if (shop.hasTantalusSpendBlock(state, engine, "💰 Tantalus' Curse: Cannot spend gold!")) return true;
            if (!shop.ensureCanAfford(state, cost, engine, 'Not enough gold!')) return true;
        }

        const category = chip.getAttribute('data-category');
        const applied = card.devotionAscended
            ? card.applyAscendedConsecration(state, category)
            : card.applyWorship(state, engine);
        if (!applied) {
            engine?.showMessage?.('That offering was refused.');
            return true;
        }

        shop.effects?.hideAllTooltips?.();
        if (paid) {
            engine.updateGoldAnimated(-cost, 'worship consecration');
            shop.sound?.play?.('coin3', { pitch: 0.98, volume: 0.6 });
        }
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('shop_worship_consecrated', {
                id: card.id, category, cost, goldAfter: state.gold,
            });
        }
        this.flash(chip);
        this.clearTargets();

        const packContainer = shop._getActivePackContainer?.(el);
        if (el) el.remove();
        if (packContainer) shop._finalizePackClaim(packContainer, packContainer.dataset.packType, state);
        engine?.showMessage?.(paid ? `Bought and offered: ${card.name}` : `Offered: ${card.name}`);
        engine?.updateAllUI?.();
        return true;
    },
};

if (typeof window !== 'undefined') window.WorshipDrop = WorshipDrop;
