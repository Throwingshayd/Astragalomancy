/**
 * ShopUI - Renders and handles shop interactions (DOM, events, pack opening, expulsion).
 * Uses ShopStockGenerator for pure stock logic. Separates UI from game mechanics.
 * @module ShopUI
 */

/* exported ShopUI */
/* global Boon, WorshipCard, LibationCard, Artifact, GAME_BALANCE, Logger */

class ShopUI {
    /**
     * @param {UIManager} uiManager - Parent UIManager for dom, updateAllUI, createRippleEffect
     */
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.shopState = {
            openedPacks: new Set(),
            rerolls: 1
        };
        this.shopItemIndex = 0;
        /** @type {{ card: Card, element?: HTMLElement, gameState: Object, gameEngine: Object, refundGold?: number, packContainer?: HTMLElement, packType?: string } | null} */
        this.expulsionPending = null;
        /** @type {null | { pointerId: number, el: HTMLElement, startX: number, startY: number, dragging: boolean, ctx: Object }} */
        this._shopDrag = null;
        this._onShopDragDocMove = (e) => this._handleShopDragDocMove(e);
        this._onShopDragDocUp = (e) => this._handleShopDragDocUp(e);
    }

    get dom() {
        return this.uiManager.dom;
    }

    getShopPrice(baseCost, gameState) {
        return ShopStockGenerator.getShopPrice(baseCost, gameState);
    }

    getPackName(packType) {
        const names = { boon: 'Boon Pack', worship: 'Worship Pack', libation: 'Libation Pack', chaos: 'Chaos Pack' };
        return names[packType] || 'Unknown Pack';
    }

    getShopDisplayedCardIds() {
        const container = document.getElementById('shopDirectSales');
        if (!container) return new Set();
        return new Set(
            Array.from(container.querySelectorAll('[data-card-id]'))
                .map(el => el.dataset.cardId)
                .filter(Boolean)
        );
    }

    openShop(gameState, gameEngine) {
        gameState.usedFreeReroll = false;
        this.shopState.openedPacks = new Set();

        this.uiManager.ensureShopElementsBound?.();

        const playStage = this.dom.playStage || document.getElementById('playStage');
        const shopStage = this.dom.shopStage || document.getElementById('shopStage');
        if (playStage) playStage.classList.add('hidden');
        if (shopStage) {
            window.balatroEffects?.hideAllTooltips();
            shopStage.classList.remove('hidden');
        } else {
            Logger.error('Shop stage not found, cannot open shop');
            return;
        }

        this.applyShopActionButton(gameState, true);
        document.querySelector('.main-game')?.classList.add('shop-active');

        if (window.GameStateManager) window.GameStateManager.setState(window.GAME_STATES?.SHOP || 'SHOP');
        if (window.soundManager) window.soundManager.setMusicContext('shop');
        if (this.dom.shopTrial) this.dom.shopTrial.textContent = gameState.ante;
        if (this.dom.packOpeningView) this.dom.packOpeningView.classList.add('hidden');
        if (this.dom.shopDefaultView) this.dom.shopDefaultView.classList.remove('hidden');
        this.attachShopEventListeners();

        if (gameEngine?.canSave?.()) gameEngine.saveGame({ silent: true });

        requestAnimationFrame(() => this.renderStock(gameState, gameEngine));
    }

    closeShop() {
        const playStage = this.dom.playStage || document.getElementById('playStage');
        const shopStage = this.dom.shopStage || document.getElementById('shopStage');
        const packOpeningView = this.dom.packOpeningView || document.getElementById('packOpeningView');
        const shopDefaultView = this.dom.shopDefaultView || document.getElementById('shopDefaultView');

        playStage?.classList.remove('hidden');
        shopStage?.classList.add('hidden');
        packOpeningView?.classList.add('hidden');
        shopDefaultView?.classList.remove('hidden');
        document.querySelector('.main-game')?.classList.remove('shop-active');
        this.applyShopActionButton(null, false);
        if (window.soundManager) window.soundManager.setMusicContext('play');
        if (window.GameStateManager) window.GameStateManager.setState(window.GAME_STATES?.ROUND || 'ROUND');
        window.balatroEffects?.hideAllTooltips();
        const gameEngine = window.game;
        if (gameEngine?.canSave?.()) gameEngine.saveGame({ silent: true });
    }

    /**
     * Swap the single action button (#rollButton) between play ("Cast the Bones") and shop ("Reroll"),
     * and toggle the tiny cost badge sibling so the price is visible but not on the button art.
     * @param {Object|null} gameState - needed to compute free-reroll label; null on close
     * @param {boolean} shopOpen - true = shop mode, false = play mode
     */
    applyShopActionButton(gameState, shopOpen) {
        const rollBtn = document.getElementById('rollButton');
        const badge = document.getElementById('actionCostBadge');
        if (!rollBtn) return;
        if (shopOpen) {
            rollBtn.textContent = 'Cast the Bones';
            const hasFreeReroll = !!(gameState?.artifacts?.some(a => a.id === 'sundial_plus') && !gameState?.usedFreeReroll);
            const cost = typeof GAME_BALANCE !== 'undefined' ? GAME_BALANCE.SHOP_REROLL_COST : 4;
            const canAfford = hasFreeReroll || (gameState?.gold ?? 0) >= cost;
            rollBtn.disabled = !canAfford;
            if (badge) badge.classList.add('hidden');
        } else {
            rollBtn.textContent = 'Cast the Bones';
            if (badge) badge.classList.add('hidden');
        }
    }

    renderStock(gameState, gameEngine) {
        window.balatroEffects?.hideAllTooltips();
        const directSalesContainer = document.getElementById('shopDirectSales');
        const packsContainer = document.getElementById('shopPacksArea');
        const artifactsContainer = document.getElementById('shopArtifactsArea');

        if (!directSalesContainer || !packsContainer || !artifactsContainer) {
            Logger.warn('Shop containers not found');
            return;
        }

        directSalesContainer.innerHTML = '<h4>Wares</h4>';
        packsContainer.innerHTML = '<h4>Packs</h4>';
        artifactsContainer.innerHTML = '<h4>Divine Artifacts</h4>';
        this.shopItemIndex = 0;

        const stock = ShopStockGenerator.generateStock(gameState, gameEngine.prng, {
            openedPacks: this.shopState.openedPacks
        });

        stock.artifacts.forEach(artifactData => {
            const el = this.createCardElement(artifactData, 'artifact', gameState, gameEngine);
            if (el) {
                el.classList.add('shop-item-slide-in');
                el.style.animationDelay = `${this.shopItemIndex++ * 0.08}s`;
                artifactsContainer.appendChild(el);
            }
        });

        stock.directSales.forEach(({ cardData }) => {
            const el = this.createCardElement(cardData, 'direct', gameState, gameEngine);
            if (el) {
                el.classList.add('shop-item-slide-in');
                el.style.animationDelay = `${this.shopItemIndex++ * 0.08}s`;
                if (cardData?.id) el.dataset.cardId = cardData.id;
                directSalesContainer.appendChild(el);
            }
        });

        stock.packs.forEach(packData => {
            const el = this.createPackElement(packData, gameState, gameEngine);
            el.classList.add('shop-item-slide-in');
            el.style.animationDelay = `${this.shopItemIndex++ * 0.08}s`;
            packsContainer.appendChild(el);
        });
    }

    attachShopEventListeners() {
        // Continue lives below Trial stone (#shopContinueBtn); rebind each openShop.
        const continueBtn = document.getElementById('shopContinueBtn');
        if (continueBtn) {
            const newBtn = continueBtn.cloneNode(true);
            continueBtn.parentNode.replaceChild(newBtn, continueBtn);
            newBtn.addEventListener('click', () => {
                if (window.game) window.game.closeShop();
                else this.closeShop();
            });
        }
    }

    hasTantalusSpendBlock(gameState, gameEngine, message, playCancel = true) {
        const hasTantalusCurse = gameState.boons?.some(j => j.id === 'tantalus_curse');
        if (!hasTantalusCurse) return false;
        if (playCancel && window.soundManager) window.soundManager.play('cancel', { volume: 0.55 });
        gameEngine.showMessage(message);
        return true;
    }

    ensureCanAfford(gameState, effectiveCost, gameEngine, message) {
        if (gameState.gold >= effectiveCost) return true;
        if (window.soundManager) window.soundManager.play('cancel', { volume: 0.55 });
        gameEngine.showMessage(message);
        return false;
    }

    refillDirectSales(gameState, gameEngine, directSalesContainer) {
        if (!directSalesContainer) return;
        directSalesContainer.innerHTML = '<h4>Wares</h4>';
        this.shopItemIndex = 0;
        const items = ShopStockGenerator.generateDirectSalesOnly(gameState, gameEngine.prng, new Set());
        items.forEach(({ cardData }) => {
            const el = this.createCardElement(cardData, 'direct', gameState, gameEngine);
            if (!el) return;
            el.dataset.cardId = cardData.id;
            el.classList.add('shop-item-slide-in');
            el.style.animationDelay = `${this.shopItemIndex++ * 0.08}s`;
            directSalesContainer.appendChild(el);
        });
    }

    logRerollStock(paid, directSalesContainer) {
        if (typeof PlaytestRecorder === 'undefined' || !PlaytestRecorder.active) return;
        const ids = Array.from(directSalesContainer?.querySelectorAll('[data-card-id]') || [])
            .map((el) => el.dataset.cardId)
            .filter(Boolean);
        PlaytestRecorder.log('shop_stock_after_reroll', { paid, directSaleIds: ids });
    }

    createCardElement(cardData, type, gameState, gameEngine) {
        let cardInstance;
        let cardEl;
        const displayData = (type === 'direct' || type === 'artifact') && gameState
            ? { ...cardData, baseCost: cardData.cost ?? 0, cost: this.getShopPrice(cardData.cost ?? 0, gameState) }
            : cardData;

        if (type === 'artifact') {
            cardInstance = new Artifact(displayData);
            cardEl = cardInstance.render(true, true);
            cardEl.classList.add('shop-draggable-card', 'shop-draggable-artifact');
            this._attachShopCardDrag(cardEl, { mode: 'artifact', artifactData: displayData, gameState, gameEngine });
        } else {
            if (displayData.rarity === 'worship') cardInstance = new WorshipCard(displayData);
            else if (displayData.rarity === 'libation') cardInstance = new LibationCard(displayData);
            else cardInstance = new Boon(displayData);
            const isDirect = type === 'direct';
            cardEl = cardInstance.render(true, isDirect);
            if (type === 'direct') {
                cardEl.classList.add('shop-draggable-card', 'shop-draggable-ware');
                this._attachShopCardDrag(cardEl, { mode: 'direct', card: cardInstance, gameState, gameEngine });
            }
            if (type === 'pack') {
                cardEl.classList.add('shop-draggable-card', 'shop-draggable-pack-reveal');
                this._attachShopCardDrag(cardEl, { mode: 'packReveal', card: cardInstance, gameState, gameEngine });
            }
        }

        return cardEl;
    }

    createPackElement(packData, gameState, gameEngine) {
        const pack = document.createElement('div');
        pack.className = `card pack-card pack-${packData.type} shop-draggable-pack-shelf`;
        pack.dataset.packType = packData.type;
        pack._shopPackData = packData;
        pack.setAttribute('data-tooltip', JSON.stringify({
            title: packData.name,
            effect: packData.description,
            cost: packData.cost,
            type: 'pack'
        }));
        const eff = this.getShopPrice(packData.baseCost ?? packData.cost, gameState);
        pack.setAttribute('data-pack-shelf', 'true');
        pack.setAttribute('aria-label', packData.name);
        pack.innerHTML = `<div class="card-shop-cost">${eff}g</div>`;
        this._attachPackShelfDrag(pack, gameState, gameEngine);
        return pack;
    }

    /** @param {HTMLElement} cardEl @param {{ mode: string, card?: Card, artifactData?: Object, gameState: Object, gameEngine: Object }} ctx */
    _attachShopCardDrag(cardEl, ctx) {
        cardEl.style.touchAction = 'none';
        cardEl.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || this._shopDrag) return;
            e.preventDefault();
            this._shopDrag = {
                pointerId: e.pointerId,
                el: cardEl,
                startX: e.clientX,
                startY: e.clientY,
                dragging: false,
                ctx,
            };
            try { cardEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
            document.addEventListener('pointermove', this._onShopDragDocMove);
            document.addEventListener('pointerup', this._onShopDragDocUp);
            document.addEventListener('pointercancel', this._onShopDragDocUp);
        });
    }

    _attachPackShelfDrag(packEl, gameState, gameEngine) {
        packEl.style.touchAction = 'none';
        packEl.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || this._shopDrag) return;
            e.preventDefault();
            const packData = packEl._shopPackData;
            if (!packData) return;
            this._shopDrag = {
                pointerId: e.pointerId,
                el: packEl,
                startX: e.clientX,
                startY: e.clientY,
                dragging: false,
                ctx: { mode: 'packShelf', packData, gameState, gameEngine },
            };
            try { packEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
            document.addEventListener('pointermove', this._onShopDragDocMove);
            document.addEventListener('pointerup', this._onShopDragDocUp);
            document.addEventListener('pointercancel', this._onShopDragDocUp);
        });
    }


    /** Pack cards promoted to document.body during drag are no longer under #packRevealedCards. */
    _getActivePackContainer(element) {
        const fromEl = element?.closest?.('#packRevealedCards');
        if (fromEl) return fromEl;
        const packView = document.getElementById('packOpeningView');
        if (packView && !packView.classList.contains('hidden')) {
            return document.getElementById('packRevealedCards');
        }
        return null;
    }

    _finalizePackClaim(packContainer, packType, gameState) {
        if (!packContainer) return;
        packContainer.dataset.packClaimed = 'true';
        packContainer.querySelectorAll('.card').forEach((cardEl) => cardEl.remove());
        if (packType && gameState.packs) {
            gameState.packs.push({ type: packType, name: this.getPackName(packType), openedAt: Date.now() });
        }
        setTimeout(() => this.closePackOpeningView(), 150);
    }

    _shopPointIn(px, py, el) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
    }

    _shopClearDocListeners() {
        document.removeEventListener('pointermove', this._onShopDragDocMove);
        document.removeEventListener('pointerup', this._onShopDragDocUp);
        document.removeEventListener('pointercancel', this._onShopDragDocUp);
    }

    /** Lightweight drag clone — cursor-anchored so art tracks under the pointer. */
    _startShopDragGhost(st, clientX, clientY) {
        if (st.promoted) return;
        if (typeof PointerDragGhost !== 'undefined') {
            st.ghost = PointerDragGhost.attach(st.el, 'drag-ghost');
            st.ghost.start(clientX, clientY);
        }
        st.el.classList.add('shop-drag-source-hidden');
        st.promoted = true;
        window.balatroEffects?.hideAllTooltips();
    }

    _positionShopDragAt(st, clientX, clientY) {
        if (st.ghost?.moveAt) {
            st.ghost.moveAt(clientX, clientY);
            return;
        }
        const dx = clientX - st.startX;
        const dy = clientY - st.startY;
        if (st.ghost) st.ghost.move(dx, dy);
    }

    _updateShopDropTargets(st, clientX, clientY) {
        const gold = document.getElementById('goldStone');
        const boonBar = document.getElementById('rightBoonBar');
        const consumableBar = document.getElementById('leftConsumableBar');
        const px = clientX;
        const py = clientY;
        const { ctx } = st;
        gold?.classList.toggle('shop-drop-target-hot', ctx.mode === 'packShelf' || ctx.mode === 'artifact'
            ? this._shopPointIn(px, py, gold)
            : false);
        if (ctx.mode === 'direct' || ctx.mode === 'packReveal') {
            const isBoon = ctx.card instanceof Boon;
            boonBar?.classList.toggle('shop-drop-target-hot', isBoon && this._shopPointIn(px, py, boonBar));
            consumableBar?.classList.toggle('shop-drop-target-hot', !isBoon && this._shopPointIn(px, py, consumableBar));
        }
    }

    _endShopDragGhost(st) {
        if (!st?.promoted) return;
        st.el.classList.remove('shop-drag-source-hidden');
        if (st.ghost) {
            st.ghost.end();
            st.ghost = null;
        }
        st.promoted = false;
    }


    _scheduleShopDragMove(st, clientX, clientY) {
        st.pendingX = clientX;
        st.pendingY = clientY;
        if (st.rafId) return;
        st.rafId = requestAnimationFrame(() => {
            st.rafId = 0;
            if (!this._shopDrag || this._shopDrag !== st) return;
            this._positionShopDragAt(st, st.pendingX, st.pendingY);
            if (st.dragging) this._updateShopDropTargets(st, st.pendingX, st.pendingY);
        });
    }

    _handleShopDragDocMove(e) {
        const st = this._shopDrag;
        if (!st || e.pointerId !== st.pointerId) return;
        const dx = e.clientX - st.startX;
        const dy = e.clientY - st.startY;
        const TH = 14;
        if (!st.dragging && (dx * dx + dy * dy) >= TH * TH) {
            st.dragging = true;
            this._startShopDragGhost(st, e.clientX, e.clientY);
            document.querySelector('.main-game')?.classList.add('shop-drag-active');
            const gold = document.getElementById('goldStone');
            const boonBar = document.getElementById('rightBoonBar');
            const consumableBar = document.getElementById('leftConsumableBar');
            if (st.ctx.mode === 'packShelf') gold?.classList.add('shop-drop-glow');
            if (st.ctx.mode === 'artifact') gold?.classList.add('shop-drop-glow');
            if (st.ctx.mode === 'direct') {
                if (st.ctx.card instanceof Boon) boonBar?.classList.add('shop-drop-glow');
                else consumableBar?.classList.add('shop-drop-glow');
            }
            if (st.ctx.mode === 'packReveal') {
                if (st.ctx.card instanceof Boon) boonBar?.classList.add('shop-drop-glow');
                else consumableBar?.classList.add('shop-drop-glow');
            }
        }
        if (st.dragging) {
            this._scheduleShopDragMove(st, e.clientX, e.clientY);
        }
    }

    _handleShopDragDocUp(e) {
        const st = this._shopDrag;
        if (!st || e.pointerId !== st.pointerId) return;
        this._shopClearDocListeners();
        try { st.el.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        const px = e.clientX;
        const py = e.clientY;
        const gold = document.getElementById('goldStone');
        const boonBar = document.getElementById('rightBoonBar');
        const consumableBar = document.getElementById('leftConsumableBar');
        document.querySelector('.main-game')?.classList.remove('shop-drag-active');
        [gold, boonBar, consumableBar].forEach((n) => {
            if (!n) return;
            n.classList.remove('shop-drop-glow', 'shop-drop-target-hot');
        });

        const { ctx, dragging } = st;
        this._shopDrag = null;

        if (!dragging) {
            if (ctx.mode === 'packReveal' && ctx.card) {
                this.claimCard(ctx.card, ctx.gameState, ctx.gameEngine, st.el);
                this._endShopDragGhost(st);
                return;
            }
            this._endShopDragGhost(st);
            return;
        }

        const commitDrop = () => {
            if (ctx.mode === 'packShelf' && ctx.packData && this._shopPointIn(px, py, gold)) {
                this.purchasePack(ctx.packData, ctx.gameState, ctx.gameEngine, st.el);
                return !document.contains(st.el);
            }
            if (ctx.mode === 'artifact' && ctx.artifactData && this._shopPointIn(px, py, gold)) {
                this.buyArtifact(ctx.artifactData, ctx.gameState, ctx.gameEngine, st.el);
                return !document.contains(st.el);
            }
            if (ctx.mode === 'direct' && ctx.card) {
                const isBoon = ctx.card instanceof Boon;
                const okSlot = isBoon ? this._shopPointIn(px, py, boonBar) : this._shopPointIn(px, py, consumableBar);
                if (okSlot) {
                    this.buyCard(ctx.card, ctx.gameState, ctx.gameEngine, st.el);
                    if (!document.contains(st.el) || this.expulsionPending) return true;
                    return false;
                }
                if (window.soundManager) window.soundManager.play('cancel', { volume: 0.45 });
                ctx.gameEngine?.showMessage?.(isBoon
                    ? 'Drag the boon onto your Boon column (right).'
                    : 'Drag the blessing onto your Libation column (left).');
                return false;
            }
            if (ctx.mode === 'packReveal' && ctx.card) {
                const isBoon = ctx.card instanceof Boon;
                const okSlot = isBoon ? this._shopPointIn(px, py, boonBar) : this._shopPointIn(px, py, consumableBar);
                if (okSlot) {
                    if (window.soundManager) window.soundManager.play(ctx.card instanceof Boon ? 'card1' : 'tarot1', { pitch: 0.92 + Math.random() * 0.1, volume: 0.55 });
                    this.claimCard(ctx.card, ctx.gameState, ctx.gameEngine, st.el);
                    if (!document.contains(st.el) || this.expulsionPending) return true;
                    return false;
                }
                if (window.soundManager) window.soundManager.play('cancel', { volume: 0.45 });
                ctx.gameEngine?.showMessage?.(isBoon
                    ? 'Drag onto your Boon column to claim.'
                    : 'Drag onto your Libation column to claim.');
                return false;
            }
            return false;
        };

        commitDrop();
        this._endShopDragGhost(st);
    }

    purchasePack(packData, gameState, gameEngine, packElement) {
        const effectiveCost = this.getShopPrice(packData.baseCost ?? packData.cost, gameState);
        if (gameState.gold < effectiveCost) {
            if (window.soundManager) window.soundManager.play('cancel', { volume: 0.55 });
            gameEngine.showMessage("Not enough gold!");
            return;
        }
        if (window.soundManager) window.soundManager.play('crumple2', { pitch: 0.95, volume: 0.5 });
        gameEngine.updateGoldAnimated(-effectiveCost, "pack purchase");
        this.shopState.openedPacks.add(packData.type);
        if (packElement) packElement.remove();
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('shop_pack_purchase', {
                packType: packData.type,
                cost: effectiveCost,
                goldAfter: gameState.gold,
                ante: gameState.ante,
            });
        }
        this.openPack(packData, gameState, gameEngine);
    }

    openPack(packData, gameState, gameEngine) {
        window.balatroEffects?.hideAllTooltips();
        if (this.dom.shopDefaultView) this.dom.shopDefaultView.classList.add('hidden');
        if (this.dom.packOpeningView) this.dom.packOpeningView.classList.remove('hidden');
        if (window.soundManager) {
            window.soundManager.setMusicContext('pack');
            window.soundManager.play('cardFan2', { pitch: 0.9, volume: 0.45 });
        }

        const shopDisplayedIds = this.getShopDisplayedCardIds();
        const packContents = ShopStockGenerator.generatePackContents(packData, gameState, gameEngine.prng, shopDisplayedIds);

        if (!packContents || packContents.length === 0) {
            Logger.error('Failed to generate pack contents');
            gameEngine.showMessage('Failed to open pack - no contents generated');
            return;
        }

        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('pack_open', {
                packType: packData.type,
                cardIds: packContents.map((c) => c.id).filter(Boolean),
            });
        }

        const packRevealedCards = document.getElementById('packRevealedCards');
        if (packRevealedCards) {
            packRevealedCards.innerHTML = '';
            packRevealedCards.dataset.packType = packData.type;
            packRevealedCards.dataset.packClaimed = 'false';
            packContents.forEach(cardData => {
                const cardEl = this.createCardElement(cardData, 'pack', gameState, gameEngine);
                if (cardEl) packRevealedCards.appendChild(cardEl);
            });
        }
    }

    closePackOpeningView() {
        window.balatroEffects?.hideAllTooltips();
        const packOpeningView = this.dom.packOpeningView || document.getElementById('packOpeningView');
        const shopDefaultView = this.dom.shopDefaultView || document.getElementById('shopDefaultView');
        if (!packOpeningView || !shopDefaultView) return;

        const revealedContainer = document.getElementById('packRevealedCards');
        const packType = revealedContainer?.dataset?.packType;
        if (packType) {
            this.shopState.openedPacks.add(packType);
            document.getElementById('shopPacksArea')?.querySelectorAll(`[data-pack-type="${packType}"]`).forEach(el => el.remove());
        }

        packOpeningView.classList.add('hidden');
        shopDefaultView.classList.remove('hidden');
        this.dom.shopStage?.classList.remove('pack-opening-stage');
        if (window.soundManager) window.soundManager.setMusicContext('shop');
        if (revealedContainer) {
            revealedContainer.innerHTML = '';
            revealedContainer.dataset.packClaimed = 'false';
        }
    }

    buyArtifact(artifactData, gameState, gameEngine, element) {
        window.balatroEffects?.hideAllTooltips();
        if (this.hasTantalusSpendBlock(gameState, gameEngine, "💰 Tantalus' Curse: Cannot spend gold!", false)) return;
        const effectiveCost = this.getShopPrice(artifactData.baseCost ?? artifactData.cost ?? 10, gameState);
        if (!this.ensureCanAfford(gameState, effectiveCost, gameEngine, "Not enough gold for this artifact!")) return;
        if (window.dataManager) window.dataManager.unlockItem('artifacts', artifactData.id);
        if (window.soundManager) window.soundManager.play('card1', { pitch: 0.9, volume: 0.6 });
        gameEngine.updateGoldAnimated(-effectiveCost, "artifact purchase");
        gameState.artifacts.push(artifactData);
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('shop_buy_artifact', {
                id: artifactData.id,
                cost: effectiveCost,
                goldAfter: gameState.gold,
                ante: gameState.ante,
            });
        }
        gameEngine.showMessage(`Acquired: ${artifactData.name}!`);
        element.remove();
        gameEngine.applyArtifactEffects();
        gameEngine.updateAllUI();
        if (artifactData.id === 'artifact_temple_market') {
            this.addOneDirectSale(gameState, gameEngine);
        }
    }

    buyCard(card, gameState, gameEngine, element) {
        window.balatroEffects?.hideAllTooltips();
        if (this.hasTantalusSpendBlock(gameState, gameEngine, "💰 Tantalus' Curse: Cannot spend gold!")) return;
        const effectiveCost = this.getShopPrice(card.baseCost ?? card.cost, gameState);
        if (!this.ensureCanAfford(gameState, effectiveCost, gameEngine, "Not enough gold!")) return;
        if (window.soundManager) window.soundManager.play('coin3', { pitch: 0.95 + Math.random() * 0.1, volume: 0.6 });
        gameEngine.updateGoldAnimated(-effectiveCost, "card purchase");
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('shop_buy_card', {
                id: card.id,
                cost: effectiveCost,
                goldAfter: gameState.gold,
                kind: card instanceof Boon ? 'boon' : (card instanceof WorshipCard ? 'worship' : 'libation'),
            });
        }
        if (window.balatroEffects && element) window.balatroEffects.addCardPurchaseEffect(element);
        this.claimCard(card, gameState, gameEngine, element);
    }

    claimCard(card, gameState, gameEngine, element) {
        window.balatroEffects?.hideAllTooltips();
        const packContainer = this._getActivePackContainer(element);
        if (packContainer?.dataset.packClaimed === 'true') return;

        const isDirectPurchase = element?.parentNode?.id === 'shopDirectSales';
        const boonSlotsFull = card instanceof Boon && gameState.boons.length >= gameState.boonSlots;
        const consumableSlotsFull = (card instanceof WorshipCard || card instanceof LibationCard) && gameState.consumables.length >= gameState.consumableSlots;

        if (boonSlotsFull || consumableSlotsFull) {
            const inventory = card instanceof Boon ? gameState.boons : gameState.consumables;
            if (inventory.length === 0) return;
            this.enterExpulsionMode(card, gameState, gameEngine, element, {
                refundGold: isDirectPurchase ? this.getShopPrice(card.baseCost ?? card.cost, gameState) : undefined,
                packContainer: packContainer || undefined,
                packType: packContainer?.dataset?.packType || undefined
            });
            return;
        }

        if (card instanceof Boon) {
            if (window.dataManager) window.dataManager.unlockItem('boons', card.id);
            gameState.boons.push(card);
        } else if (card instanceof WorshipCard || card instanceof LibationCard) {
            gameState.consumables.push(card);
        }

        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('inventory_gain', {
                id: card.id,
                source: packContainer ? 'pack' : 'direct',
                packType: packContainer?.dataset?.packType || null,
            });
        }

        if (element) element.remove();
        if (packContainer) {
            this._finalizePackClaim(packContainer, packContainer.dataset.packType, gameState);
        }
        gameEngine.updateAllUI();
    }

    addOneDirectSale(gameState, gameEngine) {
        const container = document.getElementById('shopDirectSales');
        if (!container) return;
        const existingIds = new Set(
            Array.from(container.querySelectorAll('[data-card-id]')).map(el => el.dataset.cardId).filter(Boolean)
        );
        const one = ShopStockGenerator.generateOneDirectSale(gameState, gameEngine.prng, existingIds);
        if (one) {
            const el = this.createCardElement(one.cardData, 'direct', gameState, gameEngine);
            if (el) {
                el.dataset.cardId = one.cardData.id;
                el.classList.add('shop-item-slide-in');
                el.style.animationDelay = `${this.shopItemIndex++ * 0.08}s`;
                container.appendChild(el);
            }
        }
    }

    rerollShop(gameState, gameEngine) {
        const directSalesContainer = document.getElementById('shopDirectSales');
        const hasChronosHourglass = gameState.artifacts?.some(a => a.id === 'sundial_plus');
        if (hasChronosHourglass && !gameState.usedFreeReroll) {
            gameState.usedFreeReroll = true;
            if (window.soundManager) window.soundManager.play('whoosh', { pitch: 0.95, volume: 0.5 });
            gameEngine.showMessage("Used your free reroll from Chronos' Hourglass!");
            if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
                PlaytestRecorder.log('shop_reroll', { paid: false, reason: 'chronos_hourglass', gold: gameState.gold });
            }
            this.refillDirectSales(gameState, gameEngine, directSalesContainer);
            this.logRerollStock(false, directSalesContainer);
            this.applyShopActionButton(gameState, true);
            return;
        }

        if (gameState.gold < GAME_BALANCE.SHOP_REROLL_COST) {
            if (window.soundManager) window.soundManager.play('cancel', { volume: 0.55 });
            gameEngine.showMessage("Not enough gold to reroll!");
            return;
        }

        if (window.soundManager) window.soundManager.play('whoosh', { pitch: 0.9 + Math.random() * 0.1, volume: 0.5 });
        const items = directSalesContainer?.querySelectorAll('.card') || [];
        items.forEach((item, i) => {
            item.classList.add('shop-item-flip-out');
            item.style.animationDelay = `${i * 0.05}s`;
        });

        setTimeout(() => {
            gameEngine.updateGoldAnimated(-GAME_BALANCE.SHOP_REROLL_COST, "reroll");
            if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
                PlaytestRecorder.log('shop_reroll', {
                    paid: true,
                    cost: GAME_BALANCE.SHOP_REROLL_COST,
                    goldAfter: gameState.gold,
                });
            }
            this.refillDirectSales(gameState, gameEngine, directSalesContainer);
            this.logRerollStock(true, directSalesContainer);
        }, 400);
    }

    sellCard(cardToSell, gameState, gameEngine) {
        const inventory = cardToSell.type === 'boon' ? gameState.boons : gameState.consumables;
        const cardIndex = inventory.findIndex(c => c.id === cardToSell.id);
        if (cardIndex > -1) {
            const soldCard = inventory.splice(cardIndex, 1)[0];
            let totalGold = soldCard.sellValue;
            gameState.boons.forEach(boon => {
                if (boon.timing && boon.timing.sell) {
                    boon.onTimingEvent('sell', gameState, { cardType: soldCard.type, card: soldCard });
                }
            });
            if (window.soundManager) window.soundManager.play('crumple1', { pitch: 0.9 + Math.random() * 0.1, volume: 0.5 });
            gameEngine.updateGoldAnimated(totalGold, "card sale");
            if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
                PlaytestRecorder.log('inventory_sell', {
                    id: soldCard.id,
                    gold: totalGold,
                    kind: soldCard.type === 'boon' ? 'boon' : 'consumable',
                });
            }
            gameEngine.showMessage(`Sold ${soldCard.name} for ${totalGold} Gold.`);
            gameEngine.updateAllUI();
        }
    }

    enterExpulsionMode(card, gameState, gameEngine, element, opts = {}) {
        if (this.expulsionPending) return;
        const inventoryType = card instanceof Boon ? 'boon' : 'consumable';
        const inventory = inventoryType === 'boon' ? gameState.boons : gameState.consumables;
        if (inventory.length === 0) return;

        const overlay = this.dom.expulsionOverlay || document.getElementById('expulsionOverlay');
        const titleEl = document.getElementById('expulsionTitle');
        const subtitleEl = document.getElementById('expulsionSubtitle');
        const gridEl = document.getElementById('expulsionCardGrid');
        const cancelBtn = document.getElementById('expulsionCancelBtn');
        // Require DOM before setting expulsionPending — otherwise no overlay and all future buys no-op (soft-lock).
        if (!overlay || !gridEl || !titleEl || !subtitleEl) return;

        this.expulsionPending = { card, element: element || null, gameState, gameEngine, refundGold: opts.refundGold, packContainer: opts.packContainer || null, packType: opts.packType || null };

        if (opts.packContainer) {
            opts.packContainer.dataset.packClaimed = 'true';
            opts.packContainer.querySelectorAll('.card').forEach((cardEl) => {
                if (cardEl !== element) cardEl.remove();
            });
        }

        titleEl.textContent = 'No Space!';
        subtitleEl.textContent = `Tap a card to sell and make room for ${card.name}:`;
        gridEl.innerHTML = '';

        inventory.forEach((c) => {
            const el = c.render();
            el.classList.add('expulsion-choice-card');
            el.addEventListener('click', () => this.completeExpulsion(c));
            gridEl.appendChild(el);
        });

        if (cancelBtn) cancelBtn.onclick = () => this.cancelExpulsion();
        overlay.classList.remove('hidden');
        window.balatroEffects?.hideAllTooltips();
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('expulsion_open', {
                incomingCard: card?.id || card?.name,
                refundGold: opts.refundGold || 0,
                boonIds: gameState.boons?.map((b) => b.id),
                consumableIds: gameState.consumables?.map((c) => c.id),
            });
        }
    }

    cancelExpulsion() {
        const p = this.expulsionPending;
        if (!p) return;
        if (window.soundManager) window.soundManager.play('cancel', { volume: 0.5 });
        if (p.refundGold && p.gameEngine) {
            p.gameEngine.updateGoldAnimated(p.refundGold, 'refund');
            p.gameEngine.showMessage('Cancelled.');
        }
        this.expulsionPending = null;
        const overlay = this.dom.expulsionOverlay || document.getElementById('expulsionOverlay');
        if (overlay) overlay.classList.add('hidden');
        if (p.packContainer) p.packContainer.dataset.packClaimed = 'false';
        p.gameEngine?.updateAllUI();
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('expulsion_cancel', {});
        }
    }

    completeExpulsion(cardToSell) {
        const p = this.expulsionPending;
        if (!p || !p.gameState || !p.gameEngine) return;
        this.sellCard(cardToSell, p.gameState, p.gameEngine);
        const { card, gameState, gameEngine, element, packContainer, packType } = p;
        this.expulsionPending = null;
        const overlay = this.dom.expulsionOverlay || document.getElementById('expulsionOverlay');
        if (overlay) overlay.classList.add('hidden');

        if (card instanceof Boon) {
            if (window.dataManager) window.dataManager.unlockItem('boons', card.id);
            gameState.boons.push(card);
        } else if (card instanceof WorshipCard || card instanceof LibationCard) {
            gameState.consumables.push(card);
        }
        if (element) element.remove();
        gameEngine.updateAllUI();
        if (packContainer) {
            this._finalizePackClaim(packContainer, packType, gameState);
        }
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('expulsion_complete', {
                soldId: cardToSell?.id,
                gainedId: card?.id,
                gainedKind: card instanceof Boon ? 'boon' : 'consumable',
            });
        }
    }
}
