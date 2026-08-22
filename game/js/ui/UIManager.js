/* exported UIManager */
// UIManager - Handles all UI updates and interactions

class UIManager {
    /**
     * @param {Object|null} services - Shared app-lifetime singletons, passed down to ShopUI. See App.initialize().
     */
    constructor(services = null) {
        this.dom = {};
        this.isInitialized = false;
        this.services = services;
        /** @type {ShopUI|null} */
        this.shopUI = null;
    }

    initialize() {
        if (this.isInitialized) {
            Logger.debug('UIManager already initialized, skipping...');
            return;
        }
        
        this.bindDOMElements();
        this.setupShopManager();
        this.isInitialized = true;
        Logger.info('UIManager initialized successfully');
    }

    bindDOMElements() {
        this.dom = {
            // Game info displays
            trialDisplay: document.getElementById('trialDisplay'),
            turnDisplay: document.getElementById('turnDisplay'),
            rollsLeft: document.getElementById('rollsLeft'),
            goldDisplay: document.getElementById('goldDisplay'),
            totalScore: document.getElementById('totalScore'),
            scoreThresholdDisplay: document.getElementById('scoreThresholdDisplay'),
            
            // Dice and rolling
            diceContainer: document.getElementById('diceContainer'),
            rollButton: document.getElementById('rollButton'),
            departButton: document.getElementById('departButton'),
            liveScoreDisplay: document.getElementById('liveScoreDisplay'),
            
            // Scorecard
            scorecardRows: document.querySelectorAll('.score-row'),
            
            // Play-area: boon slots + the two consumable rails (blessings, libations)
            boonSlots: document.getElementById('boonSlots'),
            worshipSlots: document.getElementById('worshipSlots'),
            libationSlots: document.getElementById('libationSlots'),
            boonSlotCounter: document.getElementById('boonSlotCounter'),
            worshipSlotCounter: document.getElementById('worshipSlotCounter'),
            libationSlotCounter: document.getElementById('libationSlotCounter'),
            
            // Shop stage (replaces rolling area per 6-translator)
            playStage: document.getElementById('playStage'),
            shopStage: document.getElementById('shopStage'),
            shopDefaultView: document.getElementById('shopDefaultView'),
            packOpeningView: document.getElementById('packOpeningView'),
            shopTrial: document.getElementById('shopTrial'),
            interestDisplay: document.getElementById('interestDisplay'),
            
            // Overlays
            confirmOverlay: document.getElementById('confirmOverlay'),
            libationOverlay: document.getElementById('libationOverlay'),
            expulsionOverlay: document.getElementById('expulsionOverlay'),
            
            // Message popup
            messagePopup: document.getElementById('message-popup')
        };
        
        // Clear play-area cache so slots always re-render after DOM replace (e.g. Continue)
        this._playAreaSlotsKey = null;

        // Game elements (playStage, shopStage, etc.) live in #gameUITemplate - only in DOM after loadGameUI()
        // Only run restore logic when game UI is loaded (at least one game element exists)
        const criticalElements = ['playStage', 'shopStage', 'diceContainer', 'rollButton'];
        const missingElements = criticalElements.filter(elementName => !this.dom[elementName]);
        const gameUILoaded = this.dom.playStage || this.dom.shopStage;
        
        if (missingElements.length > 0 && gameUILoaded) {
            // Game UI exists but some elements missing - restore/rebind
            Logger.debug(`Restoring missing UI elements: ${missingElements.join(', ')}`);
            this.restoreMissingElements(missingElements);
            this.rebindRestoredElements(missingElements);
        }
        // Else: pre-game (template not cloned yet) - nothing to restore, bindDOMElements runs again after loadGameUI()
        
        Logger.info('UIManager DOM elements bound successfully');
    }

    rebindRestoredElements(restoredElements) {
        // Re-bind DOM references for restored elements
        if (restoredElements.includes('shopStage')) {
            this.dom.playStage = document.getElementById('playStage');
            this.dom.shopStage = document.getElementById('shopStage');
            this.dom.shopDefaultView = document.getElementById('shopDefaultView');
            this.dom.packOpeningView = document.getElementById('packOpeningView');
            this.dom.shopContinueBtn = document.getElementById('shopContinueBtn');
            this.dom.actionCostBadge = document.getElementById('actionCostBadge');
            Logger.debug('Shop stage DOM elements rebound');
        }
    }

    restoreMissingElements(missingElements) {
        // Shop is in template (shopStage) - no restore; rebind after game loads
        if (missingElements.includes('shopStage') && !this.dom.shopStage) {
            Logger.debug('Shop stage not found (template may not be loaded yet)');
        }
        
        // Try to restore dice container if missing
        if (missingElements.includes('diceContainer') && !this.dom.diceContainer) {
            this.restoreDiceContainer();
        }
        
        // Try to restore roll button if missing
        if (missingElements.includes('rollButton') && !this.dom.rollButton) {
            this.restoreRollButton();
        }
    }

    restoreDiceContainer() {
        const centerGameArea = document.querySelector('.centerGameArea') || document.querySelector('.center-game-area');
        if (!centerGameArea) return;
        
        const existingDiceContainer = document.getElementById('diceContainer');
        if (!existingDiceContainer) {
            Logger.debug('Restoring dice container...');
            
            const diceContainer = document.createElement('div');
            diceContainer.id = 'diceContainer';
            diceContainer.className = 'diceContainer';
            
            // Insert before rolling controls (dice center, button under)
            const playStage = document.getElementById('playStage') || centerGameArea.querySelector('#playStage');
            const rollingControls = centerGameArea.querySelector('.rollingControls') || centerGameArea.querySelector('.rolling-controls');
            if (playStage && rollingControls) {
                playStage.insertBefore(diceContainer, rollingControls);
            } else if (centerGameArea) {
                centerGameArea.appendChild(diceContainer);
            }
            
            this.dom.diceContainer = diceContainer;
            Logger.debug('Dice container restored successfully');
        }
    }

    restoreRollButton() {
        const rollingControls = document.querySelector('.rollingControls') || document.querySelector('.rolling-controls');
        if (!rollingControls) return;
        
        const existingRollButton = document.getElementById('rollButton');
        if (!existingRollButton) {
            Logger.debug('Restoring roll button...');
            
            const rollButton = document.createElement('button');
            rollButton.id = 'rollButton';
            rollButton.className = 'roll-button';
            rollButton.textContent = 'Cast the Bones';
            
            rollingControls.insertBefore(rollButton, rollingControls.firstChild);
            this.dom.rollButton = rollButton;
            Logger.debug('Roll button restored successfully');
        }
    }

    setupShopManager() {
        if (!this.shopUI) this.shopUI = new ShopUI(this, this.services);
        const shop = this.shopUI;
        window.shopManager = {
            openShop: (gameState, gameEngine) => shop.openShop(gameState, gameEngine),
            closeShop: (gameEngine) => shop.closeShop(gameEngine),
            rerollShop: (gameState, gameEngine) => shop.rerollShop(gameState, gameEngine),
            buyPack: (packType, gameState, gameEngine) => shop.buyPack?.(packType, gameState, gameEngine),
            buyArtifact: (artifactData, gameState, gameEngine, el) => shop.buyArtifact(artifactData, gameState, gameEngine, el),
            buyCard: (card, gameState, gameEngine, el) => shop.buyCard(card, gameState, gameEngine, el),
            claimCard: (card, gameState, gameEngine, el) => shop.claimCard(card, gameState, gameEngine, el),
            sellCard: (card, gameState, gameEngine) => shop.sellCard(card, gameState, gameEngine)
        };
    }

    /** Delegate to ShopUI for play-area sell (7-call-upon-able) */
    sellCard(card, gameState, gameEngine) {
        if (this.shopUI) this.shopUI.sellCard(card, gameState, gameEngine);
    }

    /** Delegate to ShopUI/ShopStockGenerator for price display */
    getShopPrice(baseCost, gameState) {
        return this.shopUI ? this.shopUI.getShopPrice(baseCost, gameState) : ShopStockGenerator.getShopPrice(baseCost, gameState);
    }

    /** Delegate to ShopUI (used by GameEngine resume + window.shopManager) */
    openShop(gameState, gameEngine) {
        if (this.shopUI) this.shopUI.openShop(gameState, gameEngine);
    }

    updateAll(gameState, gameEngine) {
        if (!this.isInitialized) return;
        
        if (!this.dom.diceContainer || !this.dom.rollButton) return;
        this._gameEngine = gameEngine;

        this.updateInfoUI(gameState, gameEngine);
        this.updateDiceUI(gameState, gameEngine);
        this.updateScorecardUI(gameState, gameEngine);
        this.updatePlayAreaSlots(gameState, gameEngine);
        this.updateBlindUI(gameState, gameEngine);
        this.updateDepartButton(gameState, gameEngine);
        // Keep the single action button (#rollButton) synced with shop state: Continue vs Cast the Bones.
        if (this.shopUI && document.querySelector('.main-game')?.classList.contains('shop-active')) {
            this.shopUI.applyShopActionButton(gameState, true);
        }
    }

    /** Show Depart when over Trial threshold with unfilled pantheon slots (hubris early clear). */
    updateDepartButton(gameState, gameEngine) {
        const btn = this.dom.departButton || document.getElementById('departButton');
        if (!btn) return;
        this.dom.departButton = btn;
        const shopOpen = document.querySelector('.main-game')?.classList.contains('shop-active');
        const canDepart = !shopOpen
            && !gameState?.gameOver
            && !gameEngine?.isScoring
            && (gameEngine?.canDepartEarly?.()
                ?? (typeof TrialCompletion !== 'undefined' && TrialCompletion.canDepartEarly(gameState)));
        btn.classList.toggle('hidden', !canDepart);
        btn.disabled = !canDepart;
    }

    updateInfoUI(gameState, gameEngine) {
        InfoBarRenderer.updateInfoUI(this.dom, gameState, gameEngine);
    }

    updateBlindUI(gameState, gameEngine) {
        InfoBarRenderer.updateBlindUI(this.dom, gameState, gameEngine);
    }

    updateDiceUI(gameState, gameEngine = null) {
        DiceRenderer.updateDiceUI(this.dom, gameState, gameEngine);
    }

    updateScorecardUI(gameState, gameEngine = null) {
        ScorecardRenderer.updateScorecardUI(this.dom, gameState, gameEngine, this);
    }

    updatePlayAreaSlots(gameState, gameEngine) {
        PlayAreaRenderer.updatePlayAreaSlots(this.dom, gameState, gameEngine, this);
    }

    /**
     * Shared inventory card renderer — "call upon" this for boon / consumable slots.
     * Sell and use are pointer drag (gold stone, pantheon, dice) via bindBoonSlotDrag / bindConsumableHorizonDrag.
     * @param {Card} card
     * @param {HTMLElement} container
     * @param {Object} [_opts] - Reserved for legacy; unused when cards have no action labels.
     */
    appendInventoryCard(card, container, _opts = {}) {
        const cardEl = card.render();
        cardEl.classList.add('inventory-draggable');
        container.appendChild(cardEl);
        return cardEl;
    }

    /**
     * Boon bar: drag to gold to sell; drag onto another boon to reorder.
     * @param {HTMLElement} container - #boonSlots
     */
    bindBoonSlotDrag(container, gameState, gameEngine) {
        if (typeof BoonSlotDrag !== 'undefined') {
            BoonSlotDrag.bind(container, this, gameState, gameEngine);
        }
    }

    bindConsumableHorizonDrag(container, gameEngine) {
        if (typeof ConsumableDrag !== 'undefined') {
            ConsumableDrag.bind(container, this, gameEngine);
        }
    }

    applyLibationEnhancementToDieFromDrag(libation, dieIndex, gameState, gameEngine, enhancementType) {
        window.balatroEffects?.hideAllTooltips();
        const die = gameState.dice?.[dieIndex];
        if (!die || !(libation instanceof LibationCard) || !libation.canUse()) {
            gameEngine?.showMessage?.('Cannot apply libation right now.');
            return;
        }
        if (typeof BlindDirector !== 'undefined' && BlindDirector.blocksLibations(gameState)) {
            gameEngine?.showMessage?.('Solitary Path: Libations cannot be used this trial.');
            return;
        }
        if (!gameState.hasRolled) {
            gameEngine?.showMessage?.('Roll the dice first, then target a die.');
            return;
        }
        this.applyLibationEnhancementToDie(libation, dieIndex, gameState, gameEngine, enhancementType, 'consumable_drag');
    }

    /**
     * Shared libation die-application path used by drag and die-click targeting.
     * @param {LibationCard} libation
     * @param {number} dieIndex
     * @param {Object} gameState
     * @param {Object} gameEngine
     * @param {string} enhancementType
     * @param {string} [via='direct_targeting']
     * @returns {boolean}
     */
    applyLibationEnhancementToDie(libation, dieIndex, gameState, gameEngine, enhancementType, via = 'direct_targeting') {
        const die = gameState?.dice?.[dieIndex];
        if (!die || !(libation instanceof LibationCard) || !libation.canUse()) return false;
        if (typeof BlindDirector !== 'undefined' && BlindDirector.blocksLibations(gameState)) return false;
        if (!gameState.hasRolled) return false;
        const targetFace = typeof die.getEffectiveFace === 'function' ? die.getEffectiveFace() : (die.face ?? die.currentFace ?? 1);
        libation.applyEnhancementToDie(gameState, dieIndex, enhancementType, targetFace, gameEngine);
        libation.use(gameState);
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('libation_die_applied', {
                libationId: libation.id,
                dieIndex,
                enhancementType,
                targetFace,
                turn: gameState.turn,
                via,
            });
        }
        if (window.soundManager) window.soundManager.play('foil1', { pitch: 0.95 + Math.random() * 0.1, volume: 0.55 });
        const idx = gameState.consumables.findIndex(c => c.id === libation.id);
        if (idx !== -1) gameState.consumables.splice(idx, 1);
        if (gameEngine?.state) gameEngine.state.libationTargetingMode = null;
        gameEngine?.updateAllUI?.();
        window.balatroEffects?.hideAllTooltips();
        return true;
    }

    /**
     * Ascended worship: consecrate a pantheon row to this card's god & scoring hand.
     * @param {WorshipCard} card
     * @param {string} targetCategory
     * @param {Object} gameState
     * @param {Object} gameEngine
     */
    applyAscendedDevotion(card, targetCategory, gameState, gameEngine) {
        window.balatroEffects?.hideAllTooltips();
        if (!(card instanceof WorshipCard) || !card.devotionAscended) return false;
        if (typeof BlindDirector !== 'undefined' && BlindDirector.blocksWorship(gameState)) {
            gameEngine?.showMessage?.('Sacred Silence: Worship cannot be used this trial.');
            return false;
        }
        const success = card.applyAscendedConsecration(gameState, targetCategory);
        if (!success) {
            gameEngine?.showMessage?.('Cannot consecrate that row.');
            return false;
        }
        const handCategory = card.getCategory();
        const handLabel = handCategory === 'Yahtzee' ? 'Heureka' : handCategory;
        const slotLabel = targetCategory === 'Yahtzee' ? 'Heureka' : targetCategory;
        const duplicateCount = typeof DevotionUtils !== 'undefined'
            ? DevotionUtils.countSlotsForHand(gameState, handCategory)
            : 1;
        const dupNote = duplicateCount > 1
            ? ` Pantheon now has ${duplicateCount} ${handLabel} offerings.`
            : '';
        if (window.soundManager) window.soundManager.play('magic_crumple', { pitch: 1.05, volume: 0.6 });
        gameEngine?.showMessage?.(
            `${slotLabel} is consecrated to ${handLabel} (${card.god}).${dupNote}`,
            4500
        );
        const cardIndex = gameState.consumables.findIndex((c) => c.id === card.id);
        if (cardIndex !== -1) gameState.consumables.splice(cardIndex, 1);
        gameEngine?.updateAllUI?.();
        return true;
    }

    /**
     * Use a consumable (libation/worship) from play area. Not shop-related.
     * @param {LibationCard|WorshipCard} card
     * @param {Object} gameState
     * @param {Object} gameEngine
     */
    useConsumable(card, gameState, gameEngine) {
        window.balatroEffects?.hideAllTooltips();
        if (card instanceof LibationCard) {
            const libTargeting = gameEngine?.state?.libationTargetingMode;
            const euchTargeting = gameEngine?.state?.eucharistTargetingMode;
            if ((libTargeting?.libation === card || euchTargeting?.libation === card)) {
                gameEngine.cancelTargetingMode();
                return;
            }
        }
        if (card instanceof LibationCard
            && typeof BlindDirector !== 'undefined'
            && BlindDirector.blocksLibations(gameState)) {
            gameEngine.showMessage('Solitary Path: Libations cannot be used this trial.');
            return;
        }
        if (card instanceof WorshipCard
            && typeof BlindDirector !== 'undefined'
            && BlindDirector.blocksWorship(gameState)) {
            gameEngine.showMessage('Sacred Silence: Worship cannot be used this trial.');
            return;
        }
        if (!card.canUse()) {
            gameEngine.showMessage("Cannot use this consumable right now.");
            return;
        }
        let success = false;
        let message = "";
        if (card instanceof LibationCard) {
            success = card.applyRule(gameState, gameEngine);
            const pendingTarget =
                gameEngine?.state?.libationTargetingMode?.libation === card
                || gameEngine?.state?.eucharistTargetingMode?.libation === card;
            if (!success && pendingTarget) {
                return;
            }
            message = success ? `Libation activated: ${card.name}!` : "Failed to activate libation.";
        } else if (card instanceof WorshipCard) {
            success = card.applyWorship(gameState, gameEngine);
            message = success ? `Worship applied: ${card.name}!` : 'Failed to apply worship.';
        } else {
            success = card.use ? card.use() : false;
            message = success ? `Used: ${card.name}!` : "Failed to use card.";
        }
        if (success) {
            if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
                PlaytestRecorder.log('consumable_used', {
                    id: card.id,
                    kind: card instanceof LibationCard ? 'libation' : (card instanceof WorshipCard ? 'worship' : 'other'),
                    turn: gameState.turn,
                    gold: gameState.gold,
                });
            }
            if (window.soundManager) window.soundManager.play('magic_crumple', { pitch: 0.95 + Math.random() * 0.1, volume: 0.55 });
            gameEngine.showMessage(message);
            const cardIndex = gameState.consumables.findIndex(c => c.id === card.id);
            if (cardIndex !== -1) gameState.consumables.splice(cardIndex, 1);
            gameEngine.updateAllUI();
            window.balatroEffects?.hideAllTooltips();
        } else {
            if (window.soundManager) window.soundManager.play('cancel', { volume: 0.5 });
            gameEngine.showMessage(message || "Failed to use libation.");
        }
    }

    // Ensure shop DOM elements are properly bound
    ensureShopElementsBound() {
        // Re-bind shop elements if they're missing
        if (!this.dom.shopDefaultView) {
            this.dom.shopDefaultView = document.getElementById('shopDefaultView');
        }
        if (!this.dom.packOpeningView) {
            this.dom.packOpeningView = document.getElementById('packOpeningView');
        }
    }

    createRippleEffect(button, event) {
        // Create ripple element
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        // Position ripple at click coordinates
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        // Add ripple to button
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        // Remove ripple after animation completes
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

}
