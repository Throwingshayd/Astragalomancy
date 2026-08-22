/* exported Card */
/**
 * Base Card class - Foundation for all card types (Boons, Worship, Libations)
 * @class
 * @example
 * const card = new Card({ id: 'test', name: 'Test Card', cost: 5 });
 */
class Card {
    /**
     * Creates a new card instance
     * @param {Object} data - Card configuration object
     * @param {string} data.id - Unique identifier for the card
     * @param {string} data.name - Display name
     * @param {string} [data.rarity='common'] - Card rarity (rustic/vibrant/epic/worship/libation)
     * @param {number} [data.cost=0] - Purchase cost in gold
     * @param {number} [data.sellValue] - Sell value (defaults to 25% of cost, min 1; 0 stays 0)
     * @param {string} [data.effect=''] - Effect description
     * @param {string} [data.type='card'] - Card type (boon/worship/libation/artifact)
     * @param {string|null} [data.god=null] - Associated god name
     * @param {string} [data.description=''] - Detailed description
     * @param {number} [data.usesLeft=-1] - Remaining uses (-1 = unlimited)
     * @param {number} [data.maxUses=-1] - Maximum uses (-1 = unlimited)
     */
    constructor(data) {
        // Core properties
        this.id = data.id;
        this.name = data.name;
        this.rarity = data.rarity || 'common';
        this.cost = data.cost || 0;
        this.baseCost = data.baseCost ?? data.cost ?? 0; // For shop: base before Merchant Arrival
        this.sellValue = data.sellValue ?? Card.defaultSellValue(this.cost);
        this.effect = data.effect || '';
        this.type = data.type || 'card';
        
        // Additional properties
        this.god = data.god || null;
        this.description = data.description || '';
        this.isActive = true;
        this.usesLeft = data.usesLeft || -1; // -1 means unlimited
        this.maxUses = data.maxUses || -1;
        
        // Metadata
        this.timesTriggered = 0;
        this.totalValue = 0;
        this.acquired = null; // timestamp when acquired
    }

    /** 25% of cost, at least 1 gold, unless CARD_ECONOMY says otherwise. */
    static defaultSellValue(cost) {
        const pct = (typeof CARD_ECONOMY !== 'undefined' && CARD_ECONOMY.SELL_VALUE_PERCENTAGE) || 0.25;
        const min = (typeof CARD_ECONOMY !== 'undefined' && CARD_ECONOMY.DEFAULT_SELL_VALUE) || 1;
        return Math.max(min, Math.floor((Number(cost) || 0) * pct));
    }

    /**
     * Renders the card as an HTML element.
     * Surface: `rack` (shop/pack/anthology) vs `owned` (sidebars) — see docs/UI_CONSISTENCY_CHECKLIST.md
     * @param {boolean} [isShopItem=false] - true → rack surface
     * @param {boolean} [isDirectSale=false] - Whether card is a direct purchase (vs pack)
     * @param {Object|null} [gameState=null] - Run state for live boon chips
     * @returns {HTMLElement} The card's DOM element
     */
    render(isShopItem = false, isDirectSale = false, gameState = null) {
        const surface = isShopItem
            ? (typeof CARD_SURFACE !== 'undefined' ? CARD_SURFACE.RACK : 'rack')
            : (typeof CARD_SURFACE !== 'undefined' ? CARD_SURFACE.OWNED : 'owned');
        const el = document.createElement('div');
        el.className = `card ${this.type}-card ${this.rarity}`;
        el.dataset.id = this.id;

        const cardAsset = AssetMapping.getCardAsset(this.id, this.type);
        const frameAsset = AssetMapping.getFrameAsset(this.type);

        let backgroundStyle = '';
        let hasAsset = false;
        if (cardAsset) {
            const assetPath = AssetMapping.getAssetPath(cardAsset);
            if (assetPath) {
                backgroundStyle = `background-image: url('${assetPath}');`;
                hasAsset = true;
            } else {
                Logger.warn(`Asset not found for card ${this.id}: ${cardAsset}`);
            }
        }
        
        el.classList.add(hasAsset ? 'has-asset' : 'no-asset');
        if (!this.isActive) el.classList.add('disabled');

        let usesHtml = '';
        if (this.maxUses > 0) {
            usesHtml = `<div class="card-uses">${this.usesLeft}/${this.maxUses}</div>`;
        }

        let dynamicStats = [];
        let dynamicStatsHtml = '';
        if (this.type === 'boon' && gameState) {
            dynamicStats = (this.getDynamicDisplayStats ? this.getDynamicDisplayStats(gameState) : []) || [];
            if (dynamicStats.length > 0) {
                dynamicStatsHtml = '<div class="card-dynamic-stats">';
                dynamicStats.forEach(stat => {
                    const colorClass = stat.type || 'pips'; // pips, favour, gold, other
                    dynamicStatsHtml += `<div class="dynamic-stat ${colorClass}">${stat.value}</div>`;
                });
                dynamicStatsHtml += '</div>';
            }
        }

        let typeIndicatorHtml = '';
        if (this.type === 'boon') {
            typeIndicatorHtml = `<div class="card-type-indicator card-type-boon">${this.name}</div>`;
        } else if (this.type === 'worship') {
            typeIndicatorHtml = `<div class="card-type-indicator card-type-worship">${this.name}</div>`;
        } else if (this.type === 'libation') {
            typeIndicatorHtml = `<div class="card-type-indicator card-type-libation">${this.name}</div>`;
        }

        // Rack = full face text (shop/pack/anthology); owned = indicator only (card-present.css)
        const showRackFaceText = isShopItem;

        let cardContent = '';
        if (showRackFaceText) {
            cardContent = `
                <div class="card-rarity">${this.rarity}</div>
                ${usesHtml}
                <div class="card-name">${this.name}</div>
                <div class="card-effect">${this.effect}</div>
                ${this.god ? `<div class="card-god">- ${this.god}</div>` : ''}
            `;
        } else {
            cardContent = `
                <div class="card-rarity">${this.rarity}</div>
                ${usesHtml}
            `;
        }

        let frameStyle = '';
        if (frameAsset) {
            const framePath = AssetMapping.getAssetPath(frameAsset);
            if (framePath) {
                frameStyle = `background-image: url('${framePath}');`;
            } else {
                Logger.warn(`Frame asset not found for card type ${this.type}: ${frameAsset}`);
            }
        }

        // No-asset fallback title on rack only (owned uses type indicator)
        const showFallbackName = !hasAsset && isShopItem;
        el.innerHTML = `
            ${hasAsset ? `<div class="card-background" style="${backgroundStyle}"></div>` : ''}
            ${frameStyle ? `<div class="card-frame" style="${frameStyle}"></div>` : ''}
            ${!hasAsset ? `<div class="card-fallback-bg">${showFallbackName ? `<div class="fallback-name">${this.name}</div>` : ''}</div>` : ''}
            <div class="card-content">
                ${cardContent}
                ${typeIndicatorHtml}
                ${dynamicStatsHtml}
            </div>
            ${(isShopItem && isDirectSale) ? `<div class="card-shop-cost" aria-label="Price">${this.cost}g</div>` : ''}
        `;

        el.dataset.cardId = this.id;
        el.dataset.cardType = this.type;
        el.dataset.rarity = this.rarity;
        el.dataset.inShop = isShopItem.toString();
        el.dataset.cardSurface = surface;

        // Live stats ride along because the boon rail can hide face chips.
        const tooltipData = {
            title: this.name,
            effect: this.effect,
            cost: this.cost,
            sellValue: this.sellValue,
            rarity: this.rarity,
            god: this.god,
            type: this.type,
            stats: dynamicStats
        };

        el.setAttribute('data-tooltip', JSON.stringify(tooltipData));

        return el;
    }

    /**
     * Check if the card can be used
     * @returns {boolean} True if card can be activated
     */
    canUse() {
        return this.isActive && (this.usesLeft > 0 || this.usesLeft === -1);
    }

    /**
     * Use the card (decrements remaining uses if limited)
     * @returns {boolean} True if card was successfully used
     */
    use() {
        if (!this.canUse()) return false;
        
        if (this.usesLeft > 0) {
            this.usesLeft--;
        }
        
        this.timesTriggered++;
        return true;
    }

    /**
     * Disable the card (prevents usage)
     */
    disable() {
        this.isActive = false;
    }

    /**
     * Enable the card (allows usage)
     */
    enable() {
        this.isActive = true;
    }

    /**
     * Reset uses to maximum value
     */
    resetUses() {
        if (this.maxUses > 0) {
            this.usesLeft = this.maxUses;
        }
    }

    /**
     * Get card usage statistics
     * @returns {{timesTriggered: number, totalValue: number, efficiency: number, isActive: boolean, usesLeft: number}}
     */
    getStats() {
        return {
            timesTriggered: this.timesTriggered,
            totalValue: this.totalValue,
            efficiency: this.cost > 0 ? this.totalValue / this.cost : 0,
            isActive: this.isActive,
            usesLeft: this.usesLeft
        };
    }

    /**
     * Create a deep copy of this card
     * @returns {Card} Cloned card instance
     */
    clone() {
        const CardClass = this.constructor;
        const cloned = new CardClass({
            id: this.id,
            name: this.name,
            rarity: this.rarity,
            cost: this.cost,
            sellValue: this.sellValue,
            effect: this.effect,
            type: this.type,
            god: this.god,
            description: this.description,
            usesLeft: this.usesLeft,
            maxUses: this.maxUses
        });
        
        cloned.isActive = this.isActive;
        cloned.timesTriggered = this.timesTriggered;
        cloned.totalValue = this.totalValue;
        cloned.acquired = this.acquired;
        
        return cloned;
    }

    /**
     * Serialize card to JSON for saving
     * @returns {Object} Card data as plain object
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            rarity: this.rarity,
            cost: this.cost,
            sellValue: this.sellValue,
            effect: this.effect,
            type: this.type,
            god: this.god,
            description: this.description,
            isActive: this.isActive,
            usesLeft: this.usesLeft,
            maxUses: this.maxUses,
            timesTriggered: this.timesTriggered,
            totalValue: this.totalValue,
            acquired: this.acquired
        };
    }

    /**
     * Load card state from saved data
     * @param {Object} data - Saved card data
     */
    fromJSON(data) {
        Object.assign(this, data);
    }

    /**
     * Get detailed information about the card
     * @returns {Object} Comprehensive card information
     */
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            rarity: this.rarity,
            type: this.type,
            cost: this.cost,
            sellValue: this.sellValue,
            effect: this.effect,
            god: this.god,
            description: this.description,
            canUse: this.canUse(),
            stats: this.getStats()
        };
    }
}