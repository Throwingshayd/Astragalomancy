/**
 * ShopStockGenerator - Pure logic for shop stock generation
 * No DOM, no rendering. Input: gameState + prng. Output: stock data.
 * Separates game mechanics from UI per architecture (data → logic → UI).
 * @module ShopStockGenerator
 */

/* exported ShopStockGenerator */
/* global CardData, RARITY_WEIGHTS, CARD_ECONOMY, ArtifactEffects */

const ShopStockGenerator = {
    /**
     * Get card IDs the player already owns — exclude from shop and pack pools.
     * @param {Object} gameState - Current game state
     * @returns {{ boonIds: Set<string>, consumableIds: Set<string> }}
     */
    getOwnedCardIds(gameState) {
        const boons = gameState.boons || [];
        const consumables = gameState.consumables || [];
        return {
            boonIds: new Set(boons.map(j => j.id)),
            consumableIds: new Set(consumables.map(c => c.id))
        };
    },

    /**
     * Filter cards by unlocked categories (Sevens, Eights, Nines, Pandora's Box).
     * @param {Array} cardPool - Cards to filter
     * @param {Object} gameState - Must have unlockedCategories
     * @returns {Array}
     */
    filterCardsByUnlockedCategories(cardPool, gameState) {
        if (!cardPool || !Array.isArray(cardPool)) return [];
        const lockedCards = {
            'worship_pleiades': 'Sevens',
            'worship_poseidon_eights': 'Eights',
            'worship_muses': 'Nines',
            'worship_pandora': "Pandora's Box",
            'carillon_of_the_muses': 'Nines'
        };
        return cardPool.filter(card => {
            const category = lockedCards[card.id];
            if (category) {
                return gameState.unlockedCategories && gameState.unlockedCategories[category];
            }
            return true;
        });
    },

    /**
     * Weighted card selection by rarity (Balatro-style).
     * @param {Array} cardPool - Available cards (already filtered)
     * @param {Object} prng - Seeded RNG
     * @param {Object} [gameState] - For progression weighting
     * @returns {Object|null} Selected card data or null
     */
    selectCardByRarity(cardPool, prng, gameState = null) {
        if (!cardPool || cardPool.length === 0) return null;
        const rarityWeights = {
            'rustic': RARITY_WEIGHTS.RUSTIC,
            'vibrant': RARITY_WEIGHTS.VIBRANT,
            'epic': RARITY_WEIGHTS.EPIC,
            'legendary': (RARITY_WEIGHTS.LEGENDARY || 2)
        };
        const weights = cardPool.map(card => {
            const rarity = card.rarity || 'rustic';
            let baseWeight = rarityWeights[rarity] || 50;
            if (gameState) {
                const turnProgress = (gameState.turn || 1) / 13;
                if (rarity === 'epic') {
                    baseWeight = Math.floor(baseWeight * (1 + turnProgress * 0.5));
                } else if (rarity === 'rustic') {
                    baseWeight = Math.floor(baseWeight * (1 - turnProgress * 0.2));
                }
                const rarityCount = cardPool.filter(c => c.rarity === rarity).length;
                if (rarityCount <= 2) baseWeight = Math.floor(baseWeight * 1.2);
            }
            return Math.max(1, baseWeight);
        });
        const selected = prng.weightedChoice(cardPool, weights);
        return selected || cardPool[Math.floor(prng.random() * cardPool.length)];
    },

    /**
     * Effective shop price (baseCost * shopPriceMultiplier).
     * @param {number} baseCost
     * @param {Object} gameState
     * @returns {number}
     */
    getShopPrice(baseCost, gameState) {
        const mult = gameState?.shopPriceMultiplier ?? 1;
        return Math.max(1, Math.floor(baseCost * mult));
    },

    /**
     * Build filtered pools for direct sales (cached by unlockedCategories).
     * @param {Object} gameState
     * @returns {{ boons: Array, worship: Array, libations: Array }}
     */
    _getFilteredPools(gameState) {
        const unlockedKey = JSON.stringify(gameState.unlockedCategories || {});
        if (this._cache && this._cache.key === unlockedKey) {
            return this._cache.pools;
        }
        const pools = {
            boons: this.filterCardsByUnlockedCategories(
                (CardData.boons || []).filter(c => !c.shopExclude), gameState),
            worship: this.filterCardsByUnlockedCategories(
                (CardData.worship || []).filter(c => !c.shopExclude), gameState),
            libations: (CardData.libations || []).filter(c => !c.shopExclude)
        };
        this._cache = { key: unlockedKey, pools };
        return pools;
    },

    /**
     * Generate full shop stock (artifacts, direct sales, packs).
     * @param {Object} gameState
     * @param {Object} prng - Seeded RNG
     * @param {Object} options
     * @param {Set<string>} [options.openedPacks] - Pack types already opened this shop
     * @returns {{ artifacts: Array, directSales: Array, packs: Array }}
     */
    generateStock(gameState, prng, options = {}) {
        const openedPacks = options.openedPacks || new Set();
        const { boonIds: ownedBoonIds, consumableIds: ownedConsumableIds } = this.getOwnedCardIds(gameState);
        const pools = this._getFilteredPools(gameState);

        const artifacts = this._generateArtifacts(gameState, prng);
        const directSales = this._generateDirectSales(gameState, prng, pools, ownedBoonIds, ownedConsumableIds, new Set());
        const packs = this._generatePacks(gameState, prng, openedPacks);

        return { artifacts, directSales, packs };
    },

    /**
     * Generate direct sales only (for reroll).
     * @param {Object} gameState
     * @param {Object} prng
     * @param {Set<string>} excludeIds - IDs already in Wares (to avoid duplicates)
     * @returns {Array<{ cardData: Object, cardType: string }>}
     */
    generateDirectSalesOnly(gameState, prng, excludeIds = new Set()) {
        const { boonIds: ownedBoonIds, consumableIds: ownedConsumableIds } = this.getOwnedCardIds(gameState);
        const pools = this._getFilteredPools(gameState);
        return this._generateDirectSales(gameState, prng, pools, ownedBoonIds, ownedConsumableIds, excludeIds);
    },

    /**
     * Generate one additional direct sale (Temple Market mid-shop).
     */
    generateOneDirectSale(gameState, prng, excludeIds) {
        const items = this.generateDirectSalesOnly(gameState, prng, excludeIds);
        return items.length > 0 ? items[0] : null;
    },

    /**
     * One artifact per shop visit. Upgrades only enter the pool once the base is owned.
     */
    _generateArtifacts(gameState, prng) {
        const purchasedIds = new Set((gameState.artifacts || []).map(a => a.id));
        const pool = [];
        const artifacts = CardData.artifacts || {};
        for (const key in artifacts) {
            const pair = artifacts[key];
            if (!purchasedIds.has(pair.base.id)) {
                pool.push(pair.base);
            } else if (pair.upgraded && !purchasedIds.has(pair.upgraded.id)) {
                pool.push(pair.upgraded);
            }
        }
        if (pool.length === 0) return [];
        const artifact = pool[Math.floor(prng.random() * pool.length)];
        return [artifact];
    },

    _generateDirectSales(gameState, prng, pools, ownedBoonIds, ownedConsumableIds, excludeIds) {
        const numItems = 2 + Math.floor(prng.random() * 2) + (gameState.shopWareBonus ?? 0);
        const selected = new Set();
        const result = [];

        for (let i = 0; i < numItems; i++) {
            const rand = prng.random();
            let cardData = null;
            let cardType = null;

            if (rand < 0.4) {
                const available = pools.boons.filter(c => !selected.has(c.id) && !ownedBoonIds.has(c.id) && !excludeIds.has(c.id));
                if (available.length > 0) {
                    cardData = this.selectCardByRarity(available, prng, gameState);
                    cardType = 'boon';
                }
            } else if (rand < 0.7) {
                const available = pools.worship.filter(c => !selected.has(c.id) && !ownedConsumableIds.has(c.id) && !excludeIds.has(c.id));
                if (available.length > 0) {
                    cardData = available[Math.floor(prng.random() * available.length)];
                    cardType = 'worship';
                }
            } else {
                const available = pools.libations.filter(c => !selected.has(c.id) && !ownedConsumableIds.has(c.id) && !excludeIds.has(c.id));
                if (available.length > 0) {
                    cardData = available[Math.floor(prng.random() * available.length)];
                    cardType = 'libation';
                }
            }

            if (cardData) {
                selected.add(cardData.id);
                result.push({ cardData, cardType });
            }
        }
        return result;
    },

    _generatePacks(gameState, prng, openedPacks) {
        const availableTypes = ['boon', 'worship', 'libation'].filter(t => !openedPacks.has(t));
        if (availableTypes.length === 0) return [];
        const numPacks = Math.min(2, availableTypes.length);
        const selected = new Set();
        const result = [];

        const packNoun = { boon: 'Boons', worship: 'Blessings', libation: 'Libations' };
        const packDefs = {
            boon: { type: 'boon', name: 'Boon Pack', baseCost: CARD_ECONOMY?.BOON_PACK_COST ?? 4 },
            worship: { type: 'worship', name: 'Worship Pack', baseCost: CARD_ECONOMY?.WORSHIP_PACK_COST ?? 4 },
            libation: { type: 'libation', name: 'Libation Pack', baseCost: CARD_ECONOMY?.LIBATION_PACK_COST ?? 4 }
        };

        for (let i = 0; i < numPacks; i++) {
            const remaining = availableTypes.filter(t => !selected.has(t));
            if (remaining.length === 0) break;
            const packType = remaining[Math.floor(prng.random() * remaining.length)];
            selected.add(packType);
            const def = packDefs[packType];
            const reveal = typeof ArtifactEffects !== 'undefined'
                ? ArtifactEffects.packRevealCount(gameState, packType)
                : 3;
            result.push({
                ...def,
                description: `Reveals ${reveal} ${packNoun[packType]} — choose one to claim.`,
                cost: this.getShopPrice(def.baseCost, gameState)
            });
        }
        return result;
    },

    /**
     * Generate pack contents (choose-one). Hall of Heroes / Panegyris / Symposium add a
     * fourth card; The Auspices and Ganymede's Cup pin the first slot to your most-used.
     * @param {Object} packData - { type: 'boon'|'worship'|'libation' }
     * @param {Object} gameState
     * @param {Object} prng
     * @param {Set<string>} shopDisplayedIds - Cards in Wares (Balatro: exclude from packs)
     * @returns {Array<Object>} Card data objects
     */
    generatePackContents(packData, gameState, prng, shopDisplayedIds = new Set()) {
        const { boonIds: ownedBoonIds, consumableIds: ownedConsumableIds } = this.getOwnedCardIds(gameState);
        const ownedIds = packData.type === 'boon' ? ownedBoonIds : ownedConsumableIds;
        const numCards = typeof ArtifactEffects !== 'undefined'
            ? ArtifactEffects.packRevealCount(gameState, packData.type)
            : 3;
        const selected = new Set();
        const contents = [];

        const boonPool = (CardData.boons || []).filter(c => !c.shopExclude);
        const worship = CardData.worship || [];
        const libations = CardData.libations || [];

        const poolFor = (excludeIds) => {
            if (packData.type === 'boon') {
                return this.filterCardsByUnlockedCategories(
                    boonPool.filter(c => !excludeIds.has(c.id) && !ownedIds.has(c.id) && !shopDisplayedIds.has(c.id)),
                    gameState);
            }
            if (packData.type === 'worship') {
                return this.filterCardsByUnlockedCategories(
                    worship.filter(c => !excludeIds.has(c.id) && !ownedIds.has(c.id) && !shopDisplayedIds.has(c.id)),
                    gameState);
            }
            return libations.filter(c => !excludeIds.has(c.id) && !ownedIds.has(c.id) && !shopDisplayedIds.has(c.id));
        };

        const pick = (pool) => {
            if (!pool.length) return null;
            if (packData.type === 'boon') return this.selectCardByRarity(pool, prng, gameState);
            return pool[Math.floor(prng.random() * pool.length)];
        };

        if (typeof ArtifactEffects !== 'undefined') {
            const guaranteed = ArtifactEffects.guaranteedPackCard(gameState, packData.type, poolFor(selected));
            if (guaranteed) {
                selected.add(guaranteed.id);
                contents.push(guaranteed);
            }
        }

        for (let i = contents.length; i < numCards; i++) {
            const cardData = pick(poolFor(selected));
            if (cardData) {
                selected.add(cardData.id);
                contents.push(cardData);
            }
        }
        return contents;
    }
};
