// Artifact class - Represents Divine Artifacts (like Balatro's Vouchers)
// Artifacts are permanent passive effects that cost 10 gold each

class Artifact extends Card {
    constructor(data) {
        super(data);
        this.type = 'artifact';
        this.cost = data.cost ?? 10; // Merchant Arrival discount applied when data.cost passed
        this.sellValue = 0; // Artifacts cannot be sold
        this.rarity = 'artifact';

        if (!this.description && this.effect) {
            this.description = this.effect;
        }
    }

    canUse() {
        return true;
    }

    /**
     * @param {boolean} [isShopItem=false] — rack surface (shop / anthology)
     * @param {boolean} [isDirectSale=false] — show price chip in shop
     */
    render(isShopItem = false, isDirectSale = false) {
        const surface = isShopItem
            ? (typeof CARD_SURFACE !== 'undefined' ? CARD_SURFACE.RACK : 'rack')
            : (typeof CARD_SURFACE !== 'undefined' ? CARD_SURFACE.OWNED : 'owned');

        const el = document.createElement('div');
        el.className = `card artifact-card card-${this.rarity}`;
        el.dataset.id = this.id;
        el.dataset.cardSurface = surface;
        el.dataset.inShop = String(isShopItem);

        let hasAsset = false;
        let backgroundStyle = '';
        if (typeof AssetMapping !== 'undefined') {
            const cardAsset = AssetMapping.getArtifactAsset(this.id);
            if (cardAsset) {
                const assetPath = AssetMapping.getAssetPath(cardAsset);
                if (assetPath) {
                    hasAsset = true;
                    backgroundStyle = `background-image: url('${assetPath}');`;
                }
            }
        }
        if (hasAsset) {
            el.classList.add('has-asset');
        } else {
            el.classList.add('no-asset');
        }

        const typeIndicatorHtml = `<div class="card-type-indicator card-type-artifact">${this.name}</div>`;
        const costChip = (isShopItem && isDirectSale)
            ? `<div class="card-shop-cost card-shop-cost-artifact" aria-label="Price">${this.cost}g</div>`
            : '';

        el.innerHTML = `
            ${hasAsset ? `<div class="card-background" style="${backgroundStyle}"></div>` : ''}
            ${!hasAsset ? '<div class="card-fallback-bg"></div>' : ''}
            <div class="card-content">
                ${typeIndicatorHtml}
                <div class="artifact-name" aria-hidden="true">${this.name}</div>
            </div>
            ${costChip}
        `;

        if (this.effect) {
            el.setAttribute('data-tooltip', JSON.stringify({
                title: this.name,
                effect: this.effect,
                cost: isShopItem ? this.cost : undefined,
                type: 'artifact',
            }));
        }

        return el;
    }

    applyEffect(_gameState) {
        Logger.info(`Artifact purchased: ${this.name}`);
    }
}

if (typeof window !== 'undefined') {
    window.Artifact = Artifact;
}
