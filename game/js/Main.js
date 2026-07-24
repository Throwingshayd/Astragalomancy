/* exported App */
// Main application controller and entry point

class App {
    constructor() {
        this.currentScreen = 'start';
        this.game = null;
        this.uiManager = null;
        this.dataManager = null;
        this._collectionManager = null;  // Lazy: created on first showCollection()
        this.soundManager = null;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /** Lazy accessor for CollectionManager - only created when Anthology is opened */
    get collectionManager() {
        if (!this._collectionManager) {
            this._collectionManager = new CollectionManager();
        }
        return this._collectionManager;
    }

    initialize() {
        window.app = this;
        if (typeof Logger !== 'undefined') Logger.info('Initializing Dice of Dionysus...');
        
        this.dataManager = new DataManager();
        /**
         * Shared app-lifetime singletons, injected into UIManager/ShopUI/GameEngine so they
         * don't each reach through window.* individually. This object is mutated in place as
         * uiManager/shopManager come online below, then handed to every GameEngine created later.
         */
        this.services = {
            sound: window.soundManager,
            effects: window.balatroEffects,
            data: this.dataManager,
            stateManager: window.GameStateManager,
            gameStates: window.GAME_STATES,
            numberFormat: window.NumberFormat,
            app: this,
            uiManager: null,
            shopManager: null,
        };
        this.uiManager = new UIManager(this.services);
        this.services.uiManager = this.uiManager;
        this.soundManager = window.soundManager;
        
        window.dataManager = this.dataManager;
        window.uiManager = this.uiManager;
        
        this.uiManager.initialize();
        this.services.shopManager = window.shopManager;
        
        this.setupScreens();
        this.setupGlobalEventListeners();
        
        // Apply saved settings (sound, auto-save)
        const s = this.dataManager?.getSettings?.() || {};
        this.applySoundSetting(s.soundEnabled !== false, s.musicVolume, s.sfxVolume);
        if (s.autoSave === false) this.stopAutoSave();
        
        // Register PWA ServiceWorker (HTTPS or localhost only)
        this.registerServiceWorker();

        // Warm dice + table art while the player is on the menu
        if (typeof AssetPreloader !== 'undefined') {
            AssetPreloader.preloadCritical();
        }
        
        // Show start screen
        this.showStartScreen();

        if (typeof window.DisplayScale?.init === 'function') {
            window.DisplayScale.init();
        }
        
        Logger.info('Game initialized successfully!');

        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.ensureDockVisible();
        }
    }

    setupScreens() {
        this.screens = {
            start: document.getElementById('startScreen'),
            collection: document.getElementById('collectionScreen'),
            game: document.getElementById('gameViewport')
        };
        
        // Ensure all screens start hidden except start
        Object.entries(this.screens).forEach(([name, screen]) => {
            if (name !== 'start') {
                screen.classList.add('hidden');
            }
        });
    }

    setupGlobalEventListeners() {
        // Use event delegation so buttons work even if DOM is replaced or created later
        document.addEventListener('click', (e) => {
            const el = e.target?.closest?.('button, [role="button"]');
            if (!el) return;
            switch (el.id) {
                case 'playButton': this.startGame(false); break;
                case 'continueButton': this.startGame(true); break;
                case 'collectionButton': this.showCollection(); break;
                case 'settingsButton': this.showSettings(); break;
                case 'backToStartButton': this.showStartScreen(); break;
                case 'returnToMenuBtn': this.saveAndShowPauseMenu(); break;
                case 'pauseSettingsBtn': this.showSettings(); break;
                case 'pauseExitBtn': this.exitToMenuFromPause(); break;
                case 'pauseResumeBtn': this.hidePauseMenu(); break;
                case 'settingsCloseBtn': this.hideSettings(); break;
            }
        });
        
        // Collection tabs
        this.setupCollectionTabs();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Window events
        window.addEventListener('beforeunload', () => this.handleBeforeUnload());
        window.addEventListener('resize', () => this.handleResize());
        
        // Error handling
        window.addEventListener('error', (e) => this.handleError(e));
        window.addEventListener('unhandledrejection', (e) => this.handleUnhandledRejection(e));
        
        // Start music on any user interaction (Balatro: resume on click)
        document.addEventListener('click', () => {
            if (this.soundManager) this.soundManager.startOnInteraction();
        }, { once: true });
    }

    /** Balatro: G.FUNCS.options → overlay_menu with create_UIBox_settings */
    showSettings() {
        if (window.settingsOverlay) {
            window.settingsOverlay.show(() => {});
        }
    }

    hideSettings() {
        if (window.settingsOverlay) window.settingsOverlay.hide();
    }

    /** Register PWA ServiceWorker for offline support (HTTPS or localhost only). Skip in dev to avoid cache/HMR breakage. */
    registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        const h = location.hostname;
        const loopback = h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
        const isSecure = location.protocol === 'https:' || loopback;
        if (!isSecure) return;
        // Unregister on local dev server so cached JS cannot hide edits.
        // Standard local workflow is Vite on port 3000.
        const localDevPort = location.port === '3000';
        const viteDev =
            (typeof __DEV__ !== 'undefined' && __DEV__) ||
            (loopback && localDevPort);
        if (viteDev) {
            navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
            return;
        }
        try {
            navigator.serviceWorker.register('/ServiceWorker.js', { scope: '/' })
                .then(() => {
                    if (typeof Logger !== 'undefined') Logger.info('ServiceWorker registered');
                })
                .catch((err) => {
                    if (typeof Logger !== 'undefined') Logger.warn('ServiceWorker registration failed:', err);
                });
        } catch (e) {
            if (typeof Logger !== 'undefined') Logger.warn('ServiceWorker registration error:', e);
        }
    }

    /**
     * Save run before showing pause menu (Balatro: save_run at checkpoints).
     * Ensures boons/consumables persist if user exits.
     */
    saveAndShowPauseMenu() {
        if (this.game?.canSave?.()) this.game.saveGame({ force: true, silent: true });
        this.showPauseMenu();
    }

    /** Balatro: overlay_menu — create pause menu with Run Info (G.UIDEF.run_info) */
    showPauseMenu() {
        if (this._pauseOverlay) {
            this._pauseOverlay.remove();
        }
        this._pauseOverlay = document.createElement('div');
        this._pauseOverlay.className = 'overlay settings-overlay-created';
        this._pauseOverlay.style.cssText = 'z-index: 10002;';
        this._pauseOverlay.id = 'pauseMenuOverlayDynamic';
        const gameState = this.game?.state ?? null;
        const runInfoContent = typeof RunInfoOverlay !== 'undefined'
            ? RunInfoOverlay.create(gameState)
            : null;
        this._pauseOverlay.innerHTML = `
            <div class="modal-content pause-menu-modal">
                <h2 class="shop-title">Menu</h2>
                <div class="pause-menu-buttons">
                    <button class="divine-button" id="pauseSettingsBtn">Settings</button>
                    <button class="divine-button" id="pauseExitBtn">Exit to Menu</button>
                </div>
                <button class="divine-button" id="pauseResumeBtn">Resume</button>
            </div>
        `;
        const modal = this._pauseOverlay.querySelector('.pause-menu-modal');
        if (runInfoContent && modal) {
            modal.insertBefore(runInfoContent, modal.querySelector('.pause-menu-buttons'));
        }
        this._pauseOverlay.addEventListener('click', (e) => {
            if (e.target === this._pauseOverlay) this.hidePauseMenu();
        });
        document.body.appendChild(this._pauseOverlay);
    }

    hidePauseMenu() {
        if (this._pauseOverlay) {
            this._pauseOverlay.remove();
            this._pauseOverlay = null;
        }
    }

    applySoundSetting(enabled, musicVolume, sfxVolume) {
        if (this.soundManager) {
            if (enabled) {
                this.soundManager.setMusicVolume(musicVolume ?? 0.6);
                this.soundManager.setSfxVolume(sfxVolume ?? 0.8);
            } else {
                this.soundManager.setMusicVolume(0);
                this.soundManager.setSfxVolume(0);
            }
        }
    }

    applyAutoSaveSetting(_enabled) {
        this.stopAutoSave();
    }

    exitToMenuFromPause() {
        this.hidePauseMenu();
        this.exitToMenuAndSave();
    }

    /**
     * Central exit-to-menu: always save (Balatro: save_run before go_to_menu).
     * Single code path for pause Exit and GameEngine overlay Exit.
     */
    exitToMenuAndSave() {
        if (this.game?.canSave?.()) this.game.saveGame({ force: true, silent: true });
        this.showStartScreen();
    }

    setupCollectionTabs() {
        const tabs = document.querySelectorAll('.collection-tabs .divine-button');
        const grids = document.querySelectorAll('.collection-grid');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Hide all grids
                grids.forEach(grid => grid.classList.add('hidden'));
                
                // Show target grid
                const targetGridId = tab.dataset.tab + 'CollectionGrid';
                const targetGrid = document.getElementById(targetGridId);
                if (targetGrid) {
                    targetGrid.classList.remove('hidden');
                }
                this.collectionManager.setCurrentTab(tab.dataset.tab);
            });
        });
    }

    showStartScreen() {
        this.switchToScreen('start');
        this.currentScreen = 'start';
        this.updateContinueButton();
    }

    /** Balatro: G.FUNCS.can_continue — show/enable Continue only when valid save exists */
    updateContinueButton() {
        const btn = document.getElementById('continueButton');
        if (!btn) return;
        const dm = this.dataManager || new DataManager();
        const canContinue = dm.hasValidSave('auto');
        btn.style.display = canContinue ? '' : 'none';
        btn.disabled = !canContinue;
    }

    showCollection() {
        this.switchToScreen('collection');
        this.currentScreen = 'collection';
        this.ensureAnthologyTooltipsReady();
        this.collectionManager.populateCollection();
    }

    /** Tooltips on anthology cards (BalatroEffects only fully inits on play otherwise). */
    ensureAnthologyTooltipsReady() {
        if (window.balatroEffects && !window.balatroEffects.isInitialized) {
            window.balatroEffects.initialize();
        }
    }

    /**
     * Start game — new run or continue saved (Balatro: start_setup_run with New Run vs Continue)
     * @param {boolean} [continueRun=false] - If true, load from save instead of starting fresh
     */
    async startGame(continueRun = false) {
        const playBtn = document.getElementById('playButton');
        const continueBtn = document.getElementById('continueButton');
        if (playBtn) playBtn.disabled = true;
        if (continueBtn) continueBtn.disabled = true;

        if (typeof AssetPreloader !== 'undefined') {
            await AssetPreloader.ensureCritical();
        }

        // Switch to game screen
        this.switchToScreen('game');
        this.currentScreen = 'game';
        
        // Load game UI template
        this.loadGameUI();
        
        // Initialize effect systems only when entering gameplay (not on start screen or collection)
        this.ensureGameEffectsReady();
        
        if (continueRun && this.dataManager?.hasValidSave('auto')) {
            // Continue: create engine with placeholder, then load saved state
            Logger.info('Continuing saved run');
            this.game = new GameEngine('CONTINUE', this.services);
            window.game = this.game;
            this.game.bindDOMElements();
            this.uiManager.bindDOMElements();
            if (!this.game.loadGame()) {
                Logger.warn('Failed to load save; starting new run');
                this.game = new GameEngine(this.generateRandomSeed(), this.services);
                window.game = this.game;
                this.game.bindDOMElements();
                this.game.startGame();
            }
        } else {
            // New run
            const seedInput = document.getElementById('seedInput');
            let seed = seedInput ? seedInput.value.trim() : '';
            if (seed === '') {
                seed = this.generateRandomSeed();
                if (seedInput) seedInput.value = seed;
            }
            Logger.info(`Starting game with seed: ${seed}`);
            this.game = new GameEngine(seed, this.services);
            window.game = this.game;
            this.game.bindDOMElements();
            this.uiManager.bindDOMElements();
            this.game.startGame();
        }
        
        if (this.soundManager) {
            const seed = this.game?.state?.seed ?? 'NEWRUN';
            this.soundManager.initRunDeck(seed);
            this.soundManager.startOnInteraction();
        }
        
        // Checkpoint saves respect settings.autoSave; no interval timer.
        const s = this.dataManager?.getSettings?.() || {};

        // First-run tutorial overlay (when showTutorial enabled)
        if (s.showTutorial !== false) this.maybeShowTutorialOverlay();

        if (playBtn) playBtn.disabled = false;
        this.updateContinueButton();
    }

    /** Show tutorial overlay on first run when showTutorial is enabled */
    maybeShowTutorialOverlay() {
        const key = (this.dataManager?.prefix || 'diceOfDionysus_') + 'tutorialShown';
        if (localStorage.getItem(key) === '1') return;
        const overlay = document.createElement('div');
        overlay.className = 'overlay settings-overlay-created';
        overlay.style.cssText = 'z-index: 10003;';
        overlay.innerHTML = `
            <div class="modal-content settings-modal" style="max-width: 480px;">
                <h2 class="shop-title">Quick Start</h2>
                <div class="settings-content" style="text-align: left; line-height: 1.6;">
                    <p><strong>Roll:</strong> Press R or click "Cast the Bones"</p>
                    <p><strong>Hold:</strong> Click dice or press 1–5</p>
                    <p><strong>Score:</strong> Click a category on the pantheon (right). Hover to preview.</p>
                    <p><strong>Formula:</strong> Pips × Favour = final score</p>
                </div>
                <button class="divine-button" id="tutorialCloseBtn">Got it</button>
            </div>
        `;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                localStorage.setItem(key, '1');
            }
        });
        overlay.querySelector('#tutorialCloseBtn')?.addEventListener('click', () => {
            overlay.remove();
            localStorage.setItem(key, '1');
        });
        document.body.appendChild(overlay);
    }

    /** Initialize effect systems only when needed (on game start). Not called for start screen or collection. */
    ensureGameEffectsReady() {
        if (window.balatroEffects && !window.balatroEffects.isInitialized) {
            window.balatroEffects.initialize();
        }
        if (window.juiceIntegration && !window.juiceIntegration.initialized) {
            window.juiceIntegration.initialize();
        }
    }

    loadGameUI() {
        const gameContainer = document.getElementById('gameContainerWrapper');
        const template = document.getElementById('gameUITemplate');
        
        if (!template || !template.content) {
            Logger.warn('Game UI template not found – using built-in layout. Run via npm run dev for full UI.');
            return;
        }
        
        Logger.debug('Loading game UI from template');
        
        // Clear and load the game UI template into the inner game container
        if (gameContainer) {
            gameContainer.innerHTML = '';
            gameContainer.appendChild(template.content.cloneNode(true));
            if (!gameContainer._noTextSelectBound) {
                gameContainer._noTextSelectBound = true;
                gameContainer.addEventListener('selectstart', (e) => {
                    if (!e.target.closest('input, textarea, select, [contenteditable="true"]')) {
                        e.preventDefault();
                    }
                });
            }
        }
        
        Logger.info('Game UI loaded successfully');
    }

    switchToScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show target screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
        }
    }

    generateRandomSeed() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /** Legacy hook — saves happen at checkpoints, not on a timer. */
    startAutoSave() {
        this.stopAutoSave();
    }

    showSaveIndicator() {
        // Create or find save indicator
        let indicator = document.getElementById('auto-save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'auto-save-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 8px 16px;
                background: rgba(46, 204, 113, 0.9);
                color: white;
                border-radius: 4px;
                font-size: 14px;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s;
                pointer-events: none;
            `;
            indicator.textContent = '✓ Saved';
            document.body.appendChild(indicator);
        }
        
        // Show indicator
        indicator.style.opacity = '1';
        
        // Hide after configured duration
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, TIMING.SAVE_INDICATOR_DURATION);
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // Only handle shortcuts when not typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key.toLowerCase()) {
            case 'r':
                if (this.game && this.currentScreen === 'game') {
                    e.preventDefault();
                    this.game.rollDice();
                }
                break;
                
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
                if (this.game && this.currentScreen === 'game') {
                    e.preventDefault();
                    const index = parseInt(e.key) - 1;
                    this.game.toggleHold(index);
                }
                break;
                
            case 'escape':
                e.preventDefault();
                if (this.currentScreen === 'game') {
                    if (window.settingsOverlay?.isVisible?.()) {
                        this.hideSettings();
                    } else if (this._pauseOverlay) {
                        this.hidePauseMenu();
                    } else {
                        this.showPauseMenu();
                    }
                } else if (this.currentScreen === 'collection') {
                    this.showStartScreen();
                } else if (this.currentScreen === 'start') {
                    if (window.settingsOverlay?.isVisible?.()) this.hideSettings();
                }
                break;
                
            case 'c':
                if (this.currentScreen === 'start') {
                    e.preventDefault();
                    this.showCollection();
                }
                break;
                
                case 's':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (this.game) {
                        const saved = this.game.saveGame({ force: true, silent: false });
                        if (saved) {
                            this.showMessage('Game saved!');
                            this.showSaveIndicator();
                        } else {
                            this.showMessage('Cannot save right now', 2000);
                        }
                    }
                }
                break;
        }
    }

    // Event handlers
    handleBeforeUnload() {
        if (this.game && this.currentScreen === 'game') {
            this.game.saveGame({ force: true, silent: true });
        }
        this.stopAutoSave();
    }

    handleResize() {
        if (typeof window.DisplayScale?.refresh === 'function') {
            window.DisplayScale.refresh();
        }
    }

    handleError(e) {
        Logger.error('Game Error', e.error);
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('window_error', {
                message: e.error?.message || e.message || 'Unknown error',
                stack: e.error?.stack || '',
                filename: e.filename,
                lineno: e.lineno,
                screen: this.currentScreen,
            });
        }
        this.showMessage('An error occurred. Check the console for details.', 5000);
    }

    handleUnhandledRejection(e) {
        const reason = e?.reason;
        const reasonText = typeof reason === 'string' ? reason : (reason?.message || '');
        // Ignore wallet/extension connection errors (e.g., MetaMask not installed)
        if (/metamask|wallet|ethereum/i.test(reasonText)) {
            Logger.warn('Ignored wallet extension error', { reason: reasonText });
            if (typeof e.preventDefault === 'function') e.preventDefault();
            return;
        }
        Logger.error('Unhandled Promise Rejection', reason);
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('unhandled_rejection', {
                reason: typeof reason === 'string' ? reason : (reason?.message || String(reason)),
                stack: reason?.stack || '',
            });
        }
        this.showMessage('A promise was rejected. Check the console for details.', 5000);
    }

    // Utility methods
    showMessage(text, duration = 3000) {
        const popup = document.getElementById('message-popup');
        if (popup) {
            popup.textContent = text;
            popup.classList.add('show');
            setTimeout(() => {
                popup.classList.remove('show');
            }, duration);
        }
    }


}

new App();

// Development mode detection
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    Logger.debug('Development mode detected');
}