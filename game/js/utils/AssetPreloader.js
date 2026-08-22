/**
 * AssetPreloader — decode critical textures before gameplay so dice/cards appear instantly.
 * @module utils/AssetPreloader
 */
const AssetPreloader = {
    _criticalPromise: null,
    _loaded: new Set(),

    /** URLs needed before the first roll (dice sprite sheet + core table UI). */
    getCriticalUrls() {
        if (typeof AssetMapping === 'undefined') return [];
        const urls = [];
        const sheet = AssetMapping.getDiceFaceSheetPath?.() || AssetMapping.getAssetPath(AssetMapping.diceFaceSheet);
        if (sheet) urls.push(sheet);
        ['diceTable', 'rollButton', 'columnScroll', 'inGameTitle'].forEach((key) => {
            const asset = AssetMapping.getUIAsset(key);
            const path = asset ? AssetMapping.getAssetPath(asset) : null;
            if (path) urls.push(path);
        });
        urls.push('ART/background swirl.png');
        return [...new Set(urls)];
    },

    /** Warm shop/card art in the background after critical set (non-blocking). */
    getExtendedUrls() {
        if (typeof AssetMapping === 'undefined') return [];
        const urls = [];
        const addFrom = (map) => {
            if (!map) return;
            Object.values(map).forEach((name) => {
                if (!name) return;
                const path = AssetMapping.getAssetPath(name);
                if (path) urls.push(path);
            });
        };
        addFrom(AssetMapping.boons);
        addFrom(AssetMapping.worship);
        addFrom(AssetMapping.libations);
        addFrom(AssetMapping.artifacts);
        addFrom(AssetMapping.packs);
        addFrom(AssetMapping.frames);
        const shop = AssetMapping.getUIAsset('shopfront');
        if (shop) urls.push(AssetMapping.getAssetPath(shop));
        return [...new Set(urls)].filter((u) => !this._loaded.has(u));
    },

    _preloadOne(url) {
        if (this._loaded.has(url)) return Promise.resolve();
        return new Promise((resolve) => {
            const img = new Image();
            const finish = () => {
                this._loaded.add(url);
                resolve();
            };
            img.onload = () => {
                if (typeof img.decode === 'function') {
                    img.decode().then(finish).catch(finish);
                } else {
                    finish();
                }
            };
            img.onerror = () => {
                if (typeof Logger !== 'undefined') Logger.warn('AssetPreloader: failed', url);
                finish();
            };
            img.src = url;
        });
    },

    preloadUrls(urls) {
        return Promise.all(urls.map((url) => this._preloadOne(url)));
    },

    /** Start critical preload (idempotent). Returns the same promise if already running. */
    preloadCritical() {
        if (!this._criticalPromise) {
            const urls = this.getCriticalUrls();
            if (typeof Logger !== 'undefined') Logger.info(`AssetPreloader: warming ${urls.length} critical assets`);
            this._criticalPromise = this.preloadUrls(urls).then(() => {
                if (typeof Logger !== 'undefined') Logger.info('AssetPreloader: critical assets ready');
                this.preloadExtended();
            });
        }
        return this._criticalPromise;
    },

    /** Background warm for shop/cards after critical path completes. */
    preloadExtended() {
        const urls = this.getExtendedUrls();
        if (urls.length === 0) return;
        if (typeof Logger !== 'undefined') Logger.debug(`AssetPreloader: warming ${urls.length} extended assets`);
        this.preloadUrls(urls).catch(() => { /* non-fatal */ });
    },

    /** Await critical assets before entering gameplay. */
    ensureCritical() {
        return this.preloadCritical();
    },
};

if (typeof window !== 'undefined') {
    window.AssetPreloader = AssetPreloader;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetPreloader;
}
