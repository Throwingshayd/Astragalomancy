/* exported GameEngine */
// GameEngine - Main game logic and state management

class GameEngine {
    /**
     * @param {string} seed
     * @param {Object|null} services - Shared app-lifetime singletons (sound, effects, uiManager, shopManager,
     *   app, stateManager, gameStates, numberFormat, data). See App.initialize() in Main.js. Falls back to the
     *   equivalent window globals for any service not provided.
     */
    constructor(seed, services = null) {
        this.prng = new SeededRNG(seed);
        this.services = services;
        this.dataManager = new DataManager();
        this.initializeGameState(seed);
        this.setupEventListeners();
        if (typeof PlaytestRecorder !== 'undefined') {
            PlaytestRecorder.onEngineReady(this);
        }
        /** @type {LiveScoreController|null} */
        this.liveScore = null;
    }

    get sound() { return this.services?.sound ?? window.soundManager; }
    get uiManager() { return this.services?.uiManager ?? window.uiManager; }
    get shopManager() { return this.services?.shopManager ?? window.shopManager; }
    get app() { return this.services?.app ?? window.app; }
    get effects() { return this.services?.effects ?? window.balatroEffects; }
    get stateManager() { return this.services?.stateManager ?? window.GameStateManager; }
    get gameStates() { return this.services?.gameStates ?? window.GAME_STATES; }
    get numberFormat() { return this.services?.numberFormat ?? window.NumberFormat; }
    /** Distinct from this.dataManager (this engine's own save/load instance) — this is the app-wide settings store. */
    get globalData() { return this.services?.data ?? window.dataManager; }

    ensureLiveScore() {
        if (!this.liveScore && typeof LiveScoreController !== 'undefined') {
            this.liveScore = new LiveScoreController(this);
        }
        return this.liveScore;
    }


    ensureScoringAnimation() {
        if (!this.scoringAnimation && typeof ScoringAnimation !== 'undefined') {
            this.scoringAnimation = new ScoringAnimation(this);
        }
        return this.scoringAnimation;
    }

    /** @param {Function} callback Called when animation completes */
    animateScoreUpdate(category, pips, favour, finalScore, targetCategory, callback) {
        this.ensureScoringAnimation()?.playReveal(category, pips, favour, finalScore, targetCategory, callback);
    }
    /** Balatro: G.SETTINGS.GAMESPEED — scale animation delays (2x = half delay, 4x = quarter) */
    scaleDelay(ms) {
        const speed = (this.globalData?.getSettings?.()?.gameSpeed) ?? 2;
        return typeof GameTiming !== 'undefined' && GameTiming.scaleDelay
            ? GameTiming.scaleDelay(ms, speed)
            : Math.max(1, Math.round(ms / speed));
    }

    /** Parmenides Die: get target category for pantheon swap (upper↔lower by position) */
    getParmenidesTargetCategory(category) {
        if (!this.state.boons?.some(j => j.id === 'parmenides_die')) return null;
        const map = typeof BOON_EFFECTS !== 'undefined' && BOON_EFFECTS.PARMENIDES_DIE?.SWAP_MAP;
        return map ? map[category] || null : null;
    }

    initializeGameState(seed) {
        this.state = {
            /** Seed for determinism; stored for save/load (Balatro: G.GAME.pseudorandom.seed) */
            seed: seed || 'NEWRUN',
            // Core game state
            dice: Array(GAME_BALANCE.STARTING_DICE_COUNT).fill(0).map((_, index) => new Die(index + 1)),
            held: Array(GAME_BALANCE.STARTING_DICE_COUNT).fill(false),
            rollsLeft: GAME_BALANCE.STARTING_ROLLS,
            hasRolled: false,
            
            // Scoring
            scorecard: {},
            totalScore: 0,
            scoreThreshold: GAME_BALANCE.STARTING_SCORE_THRESHOLD,
            
            // Progression
            turn: 1,
            ante: GAME_BALANCE.STARTING_ANTE,
            maxTurns: GAME_BALANCE.MAX_TURNS_PER_ANTE,
            endlessMode: false,
            
            // Economy
            gold: GAME_BALANCE.STARTING_GOLD,
            baseFavour: GAME_BALANCE.BASE_FAVOUR,
            
            // Collections
            boons: [],
            artifacts: [],
            consumables: [],
            packs: [],
            libationPours: {},
            
            // Slots (capacities) — worship and libations have separate rails
            boonSlots: GAME_BALANCE.STARTING_BOON_SLOTS,
            worshipSlots: GAME_BALANCE.STARTING_WORSHIP_SLOTS,
            libationSlots: GAME_BALANCE.STARTING_LIBATION_SLOTS,
            consumableSlots: GAME_BALANCE.STARTING_WORSHIP_SLOTS + GAME_BALANCE.STARTING_LIBATION_SLOTS,
            
            // Worship system (gods from GOD_TO_CATEGORY / GOD_METADATA)
            worshipLevels: {
                'Artemis': 0, 'Aphrodite': 0, 'Hecate': 0, 'Hera': 0,
                'Athena': 0, 'Demeter': 0, 'Hephaestus': 0, 'Ares': 0,
                'Dionysus': 0, 'Hermes': 0, 'Apollo': 0, 'Iris': 0, 'Hades': 0,
                'Zeus': 0, 'Nyx': 0, 'The Pleiades': 0, 'Poseidon': 0,
                'The Nine Muses': 0, "Pandora's Box": 0
            },
            
            tempPips: 0,
            tempFavour: 0,
            
            // Boss blinds
            activeBlind: null,
            eyeFloorRank: -1,
            
            // UI state
            pendingCategory: null,
            gameOver: false,
            /** Libation die-targeting: { libation, enhancementType } when active; null otherwise */
            libationTargetingMode: null,
            /** Eucharist god-targeting: { libation } when active; null otherwise */
            eucharistTargetingMode: null,
            
            // Shop state
            usedFreeReroll: false,
            /** Scores this round (since last shop) - gold awarded at cashout (Balatro-style) */
            scoresThisRound: 0,
            /** Merchant Arrival: 0.75 = 25% off; default 1.0 */
            shopPriceMultiplier: 1,
            
            pantheonDevotion: {},
            devotionCapacity: {},
            categoryGodBinding: {},
            categoryScoringOverride: {},
            forcedDiceValues: {},
            
            // Capacity limits (maxHeld not in GAME_BALANCE)
            maxHeld: 5,
            
            // Bonus Yahtzee system
            bonusYahtzees: 0,
            yahtzeesRolledThisRun: 0,
            upperBonusAwarded: false,
            lowerBonusAwarded: false,
            unlockedCategories: {
                'Sevens': false,
                'Eights': false,
                'Nines': false,
                'Heureka': false, 'Extra Long Straight': false,
                "Pandora's Box": false
            },
            // Message in a Bottle: track if any other boon triggered this ante
            hadOtherBoonsThisAnte: false,
            /** Resume point: 'play' | 'shop' — where player was when saved */
            resumePhase: 'play'
        };

        if (typeof GameEngineTestModes !== 'undefined') {
            GameEngineTestModes.applyFromUrl(this, seed);
        }
        this.updateMaxTurns();
    }

    setupEventListeners() {
        this.domReady = false;
    }

    bindDOMElements() {
        this.dom = {
            playStage: document.getElementById('playStage'),
            diceContainer: document.getElementById('diceContainer'),
            diceRollZone: document.getElementById('diceRollZone'),
            rollButton: document.getElementById('rollButton'),
            departButton: document.getElementById('departButton'),
            liveScoreDisplay: document.getElementById('liveScoreDisplay'),
            liveCashoutContent: document.getElementById('liveCashoutContent'),
            liveCashoutLine: document.getElementById('liveCashoutLine'),
            gnosisMessage: document.getElementById('gnosisMessage'),
            
            // Info displays
            trialDisplay: document.getElementById('trialDisplay'),
            turnDisplay: document.getElementById('turnDisplay'),
            rollsLeft: document.getElementById('rollsLeft'),
            goldDisplay: document.getElementById('goldDisplay'),
            totalScore: document.getElementById('totalScore'),
            
            // Scorecard
            scorecardRows: document.querySelectorAll('.score-row'),
            
            // Card slots
            boonSlots: document.getElementById('boonSlots'),
            worshipSlots: document.getElementById('worshipSlots'),
            libationSlots: document.getElementById('libationSlots'),
            
            // Shop
            shopStage: document.getElementById('shopStage'),
            
            // Shop views
            shopDefaultView: document.getElementById('shopDefaultView'),
            packOpeningView: document.getElementById('packOpeningView'),
            
            // Messages
            messagePopup: document.getElementById('message-popup')
        };
        
        // Ensure correct styling class for live score display
        if (this.dom.liveScoreDisplay && !this.dom.liveScoreDisplay.classList.contains('live-score-display')) {
            this.dom.liveScoreDisplay.classList.add('live-score-display');
        }
        this.ensureLiveScore();
        
        // Check if essential elements exist
        if (!this.dom.rollButton) {
            Logger.warn('Roll button not found, game may not function properly');
        }
        if (!this.dom.diceContainer) {
            Logger.warn('Dice container not found, game may not function properly');
        }
        
        this.setupDOMEventListeners();
        this.domReady = true;
    }

    setupDOMEventListeners() {
        // Play: Cast the Bones. Shop: this same button Continues (marble plaque Rerolls).
        if (this.dom.rollButton) {
            this.dom.rollButton.addEventListener('click', () => {
                if (this.sound) this.sound.play('button', { volume: 0.5 });
                const shopStage = document.getElementById('shopStage');
                const shopOpen = shopStage && !shopStage.classList.contains('hidden');
                if (shopOpen) this.closeShop();
                else this.rollDice();
            });
        }

        const departBtn = document.getElementById('departButton');
        if (departBtn) {
            this.dom.departButton = departBtn;
            departBtn.addEventListener('click', () => {
                if (this.sound) this.sound.play('button', { volume: 0.5 });
                this.departEarly();
            });
        }

        // Right-click anywhere on the felt play stage (spacers + dice): unhold all dice
        const diceStage = this.dom.playStage || this.dom.diceContainer;
        if (diceStage) {
            diceStage.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.unholdAllDice();
            });
        }
        
        // Scorecard rows
        if (this.dom.scorecardRows) {
            this.dom.scorecardRows.forEach(row => {
                const category = row.dataset.category;
                if (!category) return;
                if (category === "Pandora's Box") {
                    row.addEventListener('click', () => {
                        if (this.state.eucharistTargetingMode && this.state.unlockedCategories?.["Pandora's Box"]) {
                            this.handleEucharistSelect(category);
                        }
                    });
                } else {
                    row.addEventListener('click', () => {
                        if (this.state.eucharistTargetingMode) {
                            this.handleEucharistSelect(category);
                            return;
                        }
                        this.promptScore(category);
                    });
                    row.addEventListener('mouseenter', () => {
                        if (!this.isScoring) this.scheduleLiveScorePreview(category);
                    });
                    row.addEventListener('mouseleave', () => {
                        if (!this.isScoring) this.cancelLiveScorePreview();
                    });
                }
            });
        }
        
        // Shop Reroll — marble plaque; ShopUI.attachShopEventListeners rebinds on each openShop.
        const rerollBtn = document.getElementById('shopContinueBtn');
        if (rerollBtn) {
            rerollBtn.addEventListener('click', () => {
                Logger.debug('Shop reroll clicked from GameEngine listener');
                this.rerollShop();
            });
        }

        // Menu button handled by document-level delegation in Main.js (showPauseMenu)

        // ESC cancels libation or eucharist targeting mode
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && (this.state.libationTargetingMode || this.state.eucharistTargetingMode)) {
                this.cancelTargetingMode();
            }
        });
    }

    cancelTargetingMode() {
        if (this.state.libationTargetingMode) {
            if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
                PlaytestRecorder.log('targeting_cancelled', { kind: 'libation' });
            }
            this.state.libationTargetingMode = null;
            if (this.sound) this.sound.play('cancel', { volume: 0.45 });
            this.showMessage('Libation targeting cancelled.');
            if (this.uiManager && this.dom.diceContainer) {
                this.dom.diceContainer.classList.remove('libation-targeting');
                this.dom.diceContainer.querySelector('.libation-targeting-cancel')?.remove();
            }
        }
        if (this.state.eucharistTargetingMode) {
            if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
                PlaytestRecorder.log('targeting_cancelled', { kind: 'eucharist' });
            }
            this.state.eucharistTargetingMode = null;
            this.showMessage('Eucharist selection cancelled.');
            const scorecard = document.getElementById('scorecard');
            if (scorecard) {
                scorecard.classList.remove('eucharist-targeting');
                scorecard.querySelector('.eucharist-targeting-cancel')?.remove();
            }
        }
        this.updateAllUI();
    }

    cancelLibationTargeting() {
        this.cancelTargetingMode();
    }

    handleEucharistSelect(category) {
        const mode = this.state.eucharistTargetingMode;
        if (!mode || !mode.libation) return;
        this.effects?.hideAllTooltips();
        const god = typeof GOD_TO_CATEGORY !== 'undefined' ? GOD_TO_CATEGORY[category] : null;
        if (!god) return;
        if (god === "Pandora's Box" && !this.state.unlockedCategories?.["Pandora's Box"]) return;
        this.state.worshipLevels[god] = (this.state.worshipLevels[god] || 0) + 1;
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('eucharist_used', {
                libationId: mode.libation.id,
                god,
                category,
                turn: this.state.turn,
            });
        }
        mode.libation.use(this.state);
        const idx = this.state.consumables.findIndex(c => c.id === mode.libation.id);
        if (idx !== -1) this.state.consumables.splice(idx, 1);
        this.state.eucharistTargetingMode = null;
        this.showMessage(`The Eucharist: ${god} worship increased by 1!`);
        const scorecard = document.getElementById('scorecard');
        if (scorecard) {
            scorecard.classList.remove('eucharist-targeting');
            scorecard.querySelector('.eucharist-targeting-cancel')?.remove();
        }
        this.updateAllUI();
        this.effects?.hideAllTooltips();
    }

    // Game flow methods
    startGame() {
        this.startAnte();
        
        // Wait a brief moment to ensure DOM is ready, then update UI
        setTimeout(() => {
            this.updateAllUI();
            this.ensureLiveScore()?.updateDisplay(null); // Ensure Gnosis appears from game start
        }, 100);
    }

    /** Start ante — BlindDirector assigns a random beatable boss (ante 1 is always clear). */
    startAnte() {
        BlindDirector.startAnte(this);
    }

    /**
     * Roll all non-held dice
     * Applies boon effects, animations, and decrements rolls
     */
    rollDice() {
        // FIXED: Simple, bulletproof roll mechanics
        if (this.state.rollsLeft <= 0 || this.state.gameOver) {
            return;
        }
        BlindDirector.applyHook(this);

        // Balatro-style pre-roll anticipation: dice jiggle before rolling
        if (this.dom.diceContainer) {
            const diceElements = this.dom.diceContainer.querySelectorAll('.die');
            diceElements.forEach((dieElement, index) => {
                if (!this.state.held[index]) {
                    dieElement.classList.add('pre-roll-jiggle');
                    setTimeout(() => {
                        dieElement.classList.remove('pre-roll-jiggle');
                    }, 400);
                }
            });
        }
        
        // Wait for jiggle before actual roll
        setTimeout(() => {
            this.executeRoll();
        }, 250);
    }
    
    /**
     * Max face value dice can roll (6 + bonus Yahtzees, capped at 9).
     * After 1st/2nd/3rd bonus Yahtzee, dice become 7/8/9-sided.
     */
    getMaxDieFace() {
        return 6 + Math.min(this.state.bonusYahtzees || 0, 3);
    }

    /**
     * Execute the actual dice roll (called after pre-roll animation)
     * RNG + effects, then update UI with bounce on rolled dice.
     */
    executeRoll() {
        this.applyBoonRollEffects();

        this.state.rollsLeft--;
        this.state.hasRolled = true;
        
        // Balatro SFX: dice roll (chips2)
        if (this.sound) this.sound.play('chips2', { pitch: 0.95 + this.prng.random() * 0.1 });
        
        // Shuffle dice positions (dice can appear in random slots) — before physics
        this.shuffleDicePositions();

        // Sync DOM to shuffled state so physics uses correct dice/held mapping
        if (this.domReady) this.updateAllUI();

        const held = [...this.state.held];
        const anyToRoll = held.some(h => !h);

        if (anyToRoll) {
            const sevenSidedRoll = this.state.forcedDiceValues?.sevenSidedFirstRoll;
            if (sevenSidedRoll && sevenSidedRoll.length >= 5 && this.state.turn === 1) {
                this.state.dice.forEach((die, i) => die.setFace(sevenSidedRoll[i] ?? 1));
                delete this.state.forcedDiceValues.sevenSidedFirstRoll;
            } else {
            const seq = this.state.forcedDiceValues?.winningSequence;
            if (seq && seq.length > 0) {
                const idx = (this.state.turn - 1) % seq.length;
                const faces = seq[idx];
                if (faces && faces.length >= 5) {
                    this.state.dice.forEach((die, i) => die.setFace(faces[i] ?? 1));
                } else {
                    const maxFace = this.getMaxDieFace();
                    this.state.dice.forEach((die, index) => {
                        if (!held[index]) die.roll(this.prng, maxFace);
                    });
                }
            } else {
                const maxFace = this.getMaxDieFace();
                this.state.dice.forEach((die, index) => {
                    if (!held[index]) die.roll(this.prng, maxFace);
                });
            }
            }
            this.state.dice.forEach((die, index) => die.processMotherOfPearl(this.state.dice, index, this.prng));
        }
        
        const doPostPhysicsRoll = () => {
            this.dom.diceRollZone?.closest('.center-game-area')?.classList?.remove('dice-rolling');
            this.previewUnlockBonusCategoriesOnRoll();

            const counts = {};
            this.state.dice.forEach((d) => {
                const f = this.getDieFaceValue(d, 0);
                counts[f] = (counts[f] || 0) + 1;
            });
            const rolledYahtzee = Object.values(counts).some((c) => c >= 5);
            if (rolledYahtzee) {
                if (this.effects) this.effects.screenShake(20, 800);
                if (this.sound) this.sound.play('timpani', { pitch: 0.9, volume: 0.8 });
            }

            if (this.domReady) this.updateAllUI();

            // Landing bounce on dice after UI refresh
            if (this.effects && this.dom.diceContainer) {
                const els = this.dom.diceContainer.querySelectorAll('.die');
                held.forEach((h, i) => {
                    if (!h && els[i]) this.effects.addDiceBounceEffect(els[i]);
                });
            }
            if (this.canSave()) this.saveGame();
        };

        // Original non-physics roll: immediate completion with bounce on rolled dice
        doPostPhysicsRoll();

        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            const faces = this.state.dice.map((d) => this.getDieFaceValue(d, 0));
            PlaytestRecorder.log('roll', {
                turn: this.state.turn,
                rollsAfter: this.state.rollsLeft,
                held: [...this.state.held],
                diceFaces: faces,
                boonTriggersThisTurn: this.state.boonTriggersThisTurn,
            });
        }
    }

    // Apply boon effects that trigger at turn start (Balatro-inspired timing)
    applyBoonTurnStartEffects() {
        this.state.boons.forEach(boon => {
            boon.onTimingEvent('turn_start', this.state, undefined, this);
        });
    }

    // Apply boon effects that trigger at roll start
    applyBoonRollEffects() {
        this.state.boons.forEach(boon => {
            switch (boon.id) {
                case 'achilles_heel':
                    // Achilles Heel: lose 1 Gold at the start of each roll
                    if (this.state.gold > 0) {
                        this.updateGoldAnimated(-1, "Achilles' Heel");
                        this.showMessage?.("Achilles' Heel: -1 Gold!");
                    }
                    break;
            }
        });
    }

    /**
     * Toggle hold status for a specific die
     * @param {number} index - Die index (0-4)
     */
    toggleHold(index) {
        if (!this.state.hasRolled) return;
        
        const denyHold = BlindDirector.denyHold(this.state, index);
        if (denyHold) {
            if (this.sound) this.sound.play('cancel', { volume: 0.5 });
            this.showMessage(denyHold);
            return;
        }
        
        this.state.held[index] = !this.state.held[index];
        if (this.sound) this.sound.play('highlight1', { pitch: 0.95 + this.prng.random() * 0.1, volume: 0.5 });
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            const faces = this.state.dice.map((d) => this.getDieFaceValue(d, 0));
            PlaytestRecorder.log('hold_toggle', {
                index,
                held: [...this.state.held],
                diceFaces: faces,
                turn: this.state.turn,
                rollsLeft: this.state.rollsLeft,
            });
        }
        if (this.domReady) {
            this.updateAllUI();
        }
    }

    /**
     * Unhold all dice (right-click on #playStage, including spacers around dice)
     */
    unholdAllDice() {
        if (!this.state.hasRolled) return;
        if (this.state.held.every(h => !h)) return;
        this.state.held.fill(false);
        if (this.sound) this.sound.play('whoosh', { pitch: 0.9, volume: 0.4 });
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('hold_clear_all', { turn: this.state.turn });
        }
        if (this.domReady) this.updateAllUI();
    }

    // Shuffle dice positions while maintaining their individual properties
    shuffleDicePositions() {
        // Only shuffle if this is the first roll of the turn (rollsLeft === 2)
        if (this.state.rollsLeft !== 2) {
            return;
        }
        
        // Create a copy of the dice array
        const diceCopy = [...this.state.dice];
        const heldCopy = [...this.state.held];
        
        // Fisher-Yates shuffle algorithm
        for (let i = diceCopy.length - 1; i > 0; i--) {
            const j = Math.floor(this.prng.random() * (i + 1));
            
            // Swap dice
            [diceCopy[i], diceCopy[j]] = [diceCopy[j], diceCopy[i]];
            
            // Swap held status
            [heldCopy[i], heldCopy[j]] = [heldCopy[j], heldCopy[i]];
        }
        
        // Update the state
        this.state.dice = diceCopy;
        this.state.held = heldCopy;
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('dice_shuffle', { turn: this.state.turn, held: [...this.state.held] });
        }
    }

    getDieFaceValue(die, fallback = 0) {
        if (typeof DieFaceUtils !== 'undefined') return DieFaceUtils.resolveFace(die, fallback);
        if (typeof die?.getEffectiveFace === 'function') return die.getEffectiveFace();
        return die?.face ?? die?.currentFace ?? fallback;
    }

    previewUnlockBonusCategoriesOnRoll() {
        CategoryUnlock.onRoll(this);
    }

    /**
     * Prompt user to confirm scoring in a category
     * Shows confirmation dialog with score details
     * @param {string} category - Category to score
     */
    promptScore(category) {
        if (this.isScoring) return;
        if (typeof DevotionUtils !== 'undefined') {
            if (!DevotionUtils.canScoreCategory(this.state, category)) return;
        } else if (this.state.scorecard[category] !== undefined) {
            return;
        }
        if (!this.state.hasRolled) {
            if (this.sound) this.sound.play('cancel', { volume: 0.5 });
            this.showMessage("You must roll the dice first!");
            return;
        }
        const denyScore = BlindDirector.denyScore(this.state, category);
        if (denyScore) {
            if (this.sound) this.sound.play('cancel', { volume: 0.5 });
            this.showMessage(denyScore);
            return;
        }
        if (this.sound) this.sound.play('highlight2', { pitch: 0.95, volume: 0.45 });
        this.isScoring = true;
        this.state.pendingCategory = category;
        // Score directly without confirmation overlay
        this.confirmScore();
    }

    /**
     * Confirm and execute the scoring action
     * Called when user confirms in the scoring dialog
     */
    confirmScore() {
        const category = this.state.pendingCategory;
        if (!category) return;

        // Parmenides Die: scores swap to corresponding upper↔lower slot
        const targetCategory = this.getParmenidesTargetCategory(category) || category;
        const isSwap = targetCategory !== category;
        
        let { pips, favour, isValid } = this.calculateScore(category, true);
        let finalScore = 0;

        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('score_begin', {
                category,
                targetCategory,
                isSwap,
                isValid,
                fromPipeline: true,
                pips,
                favour,
                tempPips: this.state.tempPips,
                tempFavour: this.state.tempFavour,
            });
        }
        
        if (isValid) {
            finalScore = typeof SafeMath !== 'undefined'
                ? SafeMath.safeScore(pips, favour)
                : Math.floor(pips * favour / 100);
            
            this.animateScoreUpdate(category, pips, favour, finalScore, targetCategory, () => {
                this.finalizeScoring(category, pips, favour, finalScore, targetCategory);
            });
            
        } else {
            if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
                PlaytestRecorder.log('score_scratch', { category, targetCategory, isSwap, pips, favour });
            }
            // Scratch: with Parmenides, result goes to target slot; mark source as used
            if (isSwap) {
                if (typeof DevotionUtils !== 'undefined') {
                    DevotionUtils.applyPantheonScore(this.state, targetCategory, 0);
                    DevotionUtils.applyPantheonScore(this.state, category, 0);
                } else {
                    this.state.scorecard[targetCategory] = 0;
                    this.state.scorecard[category] = 0;
                }
            } else if (typeof DevotionUtils !== 'undefined') {
                DevotionUtils.applyPantheonScore(this.state, category, 0);
            } else {
                this.state.scorecard[category] = 0;
            }
            // Still finalize for zero score
            this.finalizeScoring(category, pips, favour, 0, targetCategory);
        }
    }
    
    /**
     * Finalize scoring after animation completes
     * Runs bonuses, effects, and advances turn
     */
    finalizeScoring(category, pips, favour, finalScore, targetCategory) {
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('score_finalized', {
                category,
                targetCategory,
                pips,
                favour,
                finalScore,
                state: PlaytestRecorder.captureState(this),
            });
        }
        // Check and award Upper Sanctum bonus (Yahtzee rule):
        // If sum of Ones..Sixes >= 63 and not yet awarded, grant +35 points
        this.checkAndAwardUpperBonus();
        // Check and award Lower Sanctum bonus (Pandora's Box theme):
        // If all lower categories have been scored (non-undefined), grant +35 pips once
        this.checkAndAwardLowerBonus();
        
        BlindDirector.recordScore(this.state, targetCategory || category);
        // Apply AFTER_SCORE boon effects (Balatro-inspired timing)
        this.state.boons.forEach(boon => {
            boon.onTimingEvent('after_score', this.state, { category, pips, favour, finalScore }, this);
        });
        
        // Track scores for cashout - gold awarded at round end before shop (not per-score)
        if (finalScore > 0) {
            this.state.scoresThisRound = (this.state.scoresThisRound || 0) + 1;
        }
        
        // Reset temporary modifiers
        this.state.tempPips = 0;
        this.state.tempFavour = 0;
        
        this.cancelScore();
        this.isScoring = false;
        if (this.canSave()) this.saveGame();
        this.nextTurn();
    }
    
    
    /**
     * Animate number counting from start to end
     * @param {HTMLElement} element - Element to update
     * @param {number} start - Starting number
     * @param {number} end - Ending number
     * @param {number} duration - Animation duration in ms
     * @param {Function} callback - Called when complete
     */
    animateNumberCount(element, start, end, duration, callback) {
        if (!element) {
            Logger.warn('animateNumberCount: No element provided');
            if (callback) callback();
            return;
        }
        
        // Validate numbers
        if (typeof start !== 'number' || typeof end !== 'number' || isNaN(start) || isNaN(end)) {
            Logger.error(`Invalid numbers for animation: start=${start}, end=${end}`);
            element.textContent = this.formatDisplay(end || 0);
            if (callback) callback();
            return;
        }

        // Steppier animation: discrete steps instead of smooth interpolation
        const difference = end - start;
        const stepCount = Math.max(8, Math.min(20, Math.abs(difference)));
        const stepDuration = duration / stepCount;
        let currentStep = 0;

        const fmt = (n) => this.formatDisplay(n);
        const step = () => {
            currentStep++;
            const progress = currentStep / stepCount;
            const current = Math.floor(start + (difference * Math.min(progress, 1)));
            element.textContent = fmt(current);

            if (currentStep < stepCount) {
                setTimeout(step, stepDuration);
            } else {
                element.textContent = fmt(end);
                if (callback) callback();
            }
        };

        step();
    }
    
    
    /**
     * Get per-die bonus preview for boons that affect individual dice.
     * Used when hovering a boon to show +pips/mult popups over affected dice.
     * @param {string} boonId - Boon ID (e.g. 'pegasus_flight', 'cerberus_watch')
     * @returns {Array<{dieIndex: number, label: string}>} Affected dice and their bonus labels
     */
    getBoonDicePreview(boonId) {
        const state = this.state;
        if (!state?.dice) return [];
        const result = [];
        const held = state.held || [];

        switch (boonId) {
            case 'pegasus_flight':
                // Popup only when scored — we don't have category at hover, so no preview
                break;
            case 'cerberus_watch':
                state.dice.forEach((die, i) => {
                    if (held[i] && result.length < 3) result.push({ dieIndex: i, label: '+3 pips' });
                });
                break;
            case 'prime_time': {
                const primes = [2, 3, 5];
                if (state.unlockedCategories?.Sevens) primes.push(7);
                state.dice
                    .map((d, i) => ({ i, face: this.getDieFaceValue(d, 0) }))
                    .filter(({ face }) => primes.includes(face))
                    .forEach(({ i }) => result.push({ dieIndex: i, label: '+0.3 favour' }));
                break;
            }
            case 'the_locksmith':
                state.dice.forEach((die, i) => {
                    const heldRolls = die.rollsHeld || 0;
                    if (heldRolls > 0) result.push({ dieIndex: i, label: `+${heldRolls} pips` });
                });
                break;
            default:
                break;
        }

        return result;
    }

    
    /**
     * Update gold with Balatro-style animations
     * @param {number} change - Gold change amount (can be negative)
     * @param {string} reason - Optional reason for the change
     */
    updateGoldAnimated(change, reason = null) {
        if (typeof change !== 'number' || isNaN(change)) {
            Logger.error(`Invalid gold change: ${change}`);
            return;
        }
        
        const oldGold = this.state.gold || 0;
        const newGold = Math.max(0, oldGold + change); // Prevent negative gold
        this.state.gold = newGold;
        
        Logger.trace(`Gold: ${oldGold} → ${newGold} (${change >= 0 ? '+' : ''}${change})`, reason);
        
        // Get gold display elements (gold in gnosis-gold-box - shop no longer overlay)
        const goldDisplays = [
            document.getElementById('goldDisplay'),
            ...document.querySelectorAll('.gold-display')
        ].filter(el => el !== null);
        
        if (goldDisplays.length === 0) {
            Logger.warn('No gold display elements found');
            return;
        }
        if (change > 0 && this.sound) {
            this.sound.play(change >= 10 ? 'coin6' : 'coin3', { pitch: 0.9 + this.prng.random() * 0.1, volume: 0.6 });
        }
        goldDisplays.forEach(goldElement => {
            // Flash color
            if (change > 0) {
                goldElement.classList.add('gold-gain');
                this.showFloatingGold(`+${change}g`, goldElement, 'positive');
            } else if (change < 0) {
                goldElement.classList.add('gold-loss');
                this.showFloatingGold(`${change}g`, goldElement, 'negative');
            }
            
            // Animate count only if both values are valid numbers
            if (!isNaN(oldGold) && !isNaN(newGold)) {
                this.animateNumberCount(goldElement, oldGold, newGold, 500);
            } else {
                // Fallback: Just set the value directly
                goldElement.textContent = newGold;
            }
            
            // Reset color after animation
            setTimeout(() => {
                goldElement.classList.remove('gold-gain', 'gold-loss');
            }, 600);
        });
        
        // Don't call updateAllUI() here - it can interrupt animations
        // The UI will update naturally after animations complete
    }
    
    /**
     * Show floating +/- gold number
     * @param {string} text - Text to display (e.g., "+5g" or "-3g")
     * @param {HTMLElement} anchor - Element to position relative to
     * @param {string} type - 'positive' or 'negative'
     */
    showFloatingGold(text, anchor, type) {
        const float = document.createElement('div');
        float.className = `floating-gold ${type}`;
        float.textContent = text;
        
        const rect = anchor.getBoundingClientRect();
        float.style.left = (rect.left + rect.width / 2 - 30) + 'px';
        float.style.top = (rect.top - 30) + 'px';
        
        document.body.appendChild(float);
        
        setTimeout(() => float.remove(), 1200);
    }
    
    /**
     * Show Balatro-style game over screen
     * @param {boolean} isVictory - True if player won, false if lost
     * @param {{ reason?: string }} [opts]
     */
    showGameOverScreen(isVictory, opts = {}) {
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('game_over', {
                won: isVictory,
                reason: opts.reason || (isVictory ? 'victory' : 'defeat'),
                totalScore: this.state.totalScore,
                ante: this.state.ante,
                gold: this.state.gold,
                state: PlaytestRecorder.captureState(this),
            });
            PlaytestRecorder.maybeAutoExportOnRunEnd();
        }
        if (this.sound) this.sound.play(isVictory ? 'win' : 'negative', { volume: 0.8 });
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        overlay.style.opacity = '0';
        
        const modal = document.createElement('div');
        modal.className = 'game-over-modal';
        
        // Calculate stats
        const totalScore = this.state.totalScore;
        const highestScore = Math.max(...Object.values(this.state.scorecard).filter(v => typeof v === 'number'));
        const categoriesCompleted = Object.values(this.state.scorecard).filter(v => v !== undefined).length;
        
        modal.innerHTML = `
            <div class="game-over-header ${isVictory ? 'victory' : 'defeat'}">
                <h1 class="game-over-title">${isVictory ? 'Victory!' : 'Defeat'}</h1>
                <div class="game-over-subtitle">${isVictory ? 'The Gods Smile Upon You' : 'The Gods Turn Away'}</div>
            </div>
            
            <div class="game-over-stats">
                <div class="stat-row">
                    <span class="stat-label">Trial Reached</span>
                    <span class="stat-value">${this.state.ante}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Total Score</span>
                    <span class="stat-value stat-highlight">${totalScore}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Highest Single Score</span>
                    <span class="stat-value">${highestScore}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Categories Completed</span>
                    <span class="stat-value">${categoriesCompleted}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Gold Remaining</span>
                    <span class="stat-value">${this.state.gold}g</span>
                </div>
                ${this.state.bonusYahtzees > 0 ? `
                <div class="stat-row special">
                    <span class="stat-label">Bonus Five of a Kind</span>
                    <span class="stat-value">${this.state.bonusYahtzees}</span>
                </div>` : ''}
            </div>
            
            <div class="game-over-actions">
                <button class="game-over-button new-run" id="gameOverNewRun">
                    <span class="button-icon">🎲</span>
                    <span class="button-text">New Run</span>
                </button>
                <button class="game-over-button exit-menu" id="gameOverExit">
                    <span class="button-icon">🏛️</span>
                    <span class="button-text">Exit to Menu</span>
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Fade in
        requestAnimationFrame(() => {
            overlay.style.transition = 'opacity 0.6s ease-out';
            overlay.style.opacity = '1';
        });
        
        // Button handlers
        const newRunBtn = modal.querySelector('#gameOverNewRun');
        const exitBtn = modal.querySelector('#gameOverExit');
        
        newRunBtn.addEventListener('click', () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                this.startNewRun();
            }, 600);
        });
        
        exitBtn.addEventListener('click', () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                this.exitToMenu();
            }, 600);
        });
    }
    
    /**
     * Start a new run (reset game state)
     */
    startNewRun() {
        // Clear saved game
        if (this.dataManager) {
            this.dataManager.deleteSave('auto');
        }
        
        // Reload the page to start fresh
        window.location.reload();
    }
    
    /**
     * Exit to main menu (Balatro: go_to_menu — save run then return)
     * Uses central exitToMenuAndSave so save always runs.
     */
    exitToMenu() {
        if (this.app?.exitToMenuAndSave) {
            this.app.exitToMenuAndSave();
        } else {
            if (this.canSave()) this.saveGame();
            if (this.app) {
                this.app.switchToScreen('start');
                this.app.currentScreen = 'start';
                this.app.updateContinueButton?.();
            }
        }
    }

    // Award classic Yahtzee upper bonus (+35) when Ones..Sixes total reaches 63
    checkAndAwardUpperBonus() {
        if (this.state.upperBonusAwarded) return;
        const upperCats = ["Ones", "Twos", "Threes", "Fours", "Fives", "Sixes"];
        const sumUpper = upperCats.reduce((sum, cat) => sum + (this.state.scorecard[cat] || 0), 0);
        if (sumUpper >= 63) {
            const bonus = this.getPandoraBoxBonusAmount();
            this.state.upperBonusAwarded = true;
            this.state.totalScore += bonus;
            this.showMessage(`Pandora's Box (Upper) bonus: +${bonus}!`);
            this.checkAndUnlockPandoraBox();
            if (this.domReady) {
                this.updateAllUI();
            }
        }
    }

    // Award lower-section completion bonus: all lower categories scored (non-undefined)
    checkAndAwardLowerBonus() {
        if (this.state.lowerBonusAwarded) return;
        const lowerCats = [
            "Three of a Kind", "Small Straight", "Full House",
            "Four of a Kind", "Large Straight", "Yahtzee", "Chance"
        ];
        const allScored = lowerCats.every(cat => this.state.scorecard[cat] !== undefined);
        if (allScored) {
            const bonus = this.getPandoraBoxBonusAmount();
            this.state.lowerBonusAwarded = true;
            this.state.totalScore += bonus;
            this.showMessage(`Pandora's Box (Lower) bonus: +${bonus}!`);
            this.checkAndUnlockPandoraBox();
            if (this.domReady) {
                this.updateAllUI();
            }
        }
    }

    getPandoraBoxBonusAmount() {
        const base = 35;
        const worshipLevel = this.state.worshipLevels?.["Pandora's Box"] || 0;
        const hasWorshipCard = this.state.consumables?.some(c => c && c.id === 'worship_pandora');
        return base + worshipLevel + (hasWorshipCard ? 1 : 0);
    }

    checkAndUnlockPandoraBox() {
        if (this.state.unlockedCategories["Pandora's Box"]) return;
        if (this.state.upperBonusAwarded && this.state.lowerBonusAwarded) {
            this.state.unlockedCategories["Pandora's Box"] = true;
            this.showMessage("Pandora's Box worship unlocked!", 4000);
        }
    }

    unlockBonusCategories() {
        CategoryUnlock.unlockHighFaces(this);
    }

    /**
     * Cancel the scoring action
     * Hides confirmation dialog
     */
    cancelScore() {
        this.state.pendingCategory = null;
    }

    /**
     * Calculate the score for a given category with the current dice
     * @param {string} category - Scoring category (e.g., "Ones", "Three of a Kind", "Yahtzee")
     * @returns {{pips: number, favour: number, isValid: boolean}} Score calculation result
     * @example
     * const result = engine.calculateScore("Full House");
     * // { pips: 23, favour: 2, isValid: true }
     */
    calculateScore(category, isActualScoring = false) {
        const fail = { pips: 0, favour: 0, isValid: false, fromPipeline: false };
        if (typeof ScoringEngine === 'undefined' || typeof ScoringEngine.runPipeline !== 'function') {
            Logger.error('ScoringEngine.runPipeline unavailable');
            return fail;
        }
        const validation = ScoringEngine.validateRun(this.state, category);
        if (!validation.ok) {
            if (validation.reason !== 'locked' && validation.reason !== 'devotion_full'
                && validation.reason !== 'blind_eye') {
                Logger.error('calculateScore validation failed', { category, reason: validation.reason });
            }
            return fail;
        }

        const pipeResult = ScoringEngine.runPipeline(category, this.state, {
            tempPips: isActualScoring ? (this.state.tempPips || 0) : 0,
            tempFavour: isActualScoring ? (this.state.tempFavour || 0) : 0,
        });
        let pips = pipeResult.pips;
        let favour = pipeResult.favour;
        const isValid = pipeResult.isValid;
        const counts = typeof GnosisDisplay !== 'undefined'
            ? GnosisDisplay.getFacesAndCounts(this.state).counts
            : {};

        if (isActualScoring && isValid) {
            const hasBellows = this.state.boons?.some(j => j.id === 'bellows_of_war');
            const hasDionysus = this.state.boons?.some(j => j.id === 'dionysus_revelry');
            if (hasBellows && ['Three of a Kind', 'Four of a Kind'].includes(category)) {
                this.showMessage?.('Bellows of War: Virtual die added!', 2000);
            }
            if (hasDionysus && category === 'Full House') {
                const has3 = Object.values(counts).includes(SCORING_THRESHOLDS.FULL_HOUSE_THREE);
                const has2 = Object.values(counts).includes(SCORING_THRESHOLDS.FULL_HOUSE_TWO);
                const pairCount = Object.values(counts).filter((c) => c === 2).length;
                if (pairCount >= 2 && !(has3 && has2)) {
                    this.showMessage?.("Dionysus' Revelry: 2 pairs counted as Full House!", 3000);
                }
            }
        }

        const parchmentFortunes = (isActualScoring && isValid)
            ? DieScoreContribution.resolveParchment(this.state.dice, this.prng)
            : [];
        parchmentFortunes.forEach((f) => { favour += f.favour; });

        if (isActualScoring && isValid) {
            this.lastParchmentFortunes = parchmentFortunes;
            this.state.dice.forEach((die, index) => {
                const currentFaceData = die.faces?.[die.currentFace];
                if (currentFaceData?.enhancements?.size > 0) {
                    Logger.trace(`Die ${index + 1} enhancements:`, Array.from(currentFaceData.enhancements));
                }
                if (die.hasEnhancementForCurrentFace?.('gold')) {
                    this.updateGoldAnimated(ENHANCEMENT_BONUSES.GOLD_COINS, 'gold enhancement');
                    this.showMessage?.('Gold enhancement: +1 Gold!');
                }
            });
            parchmentFortunes.forEach((f) => {
                if (f.gold) {
                    this.updateGoldAnimated(f.gold, 'parchment');
                    this.showMessage?.(`Parchment fortune: +${f.gold} Gold!`);
                }
                if (f.favour) this.showMessage?.('Parchment blessing: +1 Favour!');
            });
        }

        return { pips, favour, isValid, fromPipeline: true };
    }

    getFavourForCategory(_category) {
        return typeof BASE_FAVOUR !== 'undefined' ? BASE_FAVOUR : 100;
    }

    /**
     * Get the pips and Favour associated with the current worship level
     * @param {string} category
     * @returns {{ pips: number, favour: number }}
     */
    getCategoryLevelBonuses(category) {
        const god = this.getGodForCategory(category);
        const level = god ? (this.state.worshipLevels[god] || 0) : 0;
        const pipCategory = typeof DevotionUtils !== 'undefined'
            ? DevotionUtils.getPipCategory(this.state, category)
            : category;
        const basePips = (typeof LOWER_SECTION_BONUSES !== 'undefined' && LOWER_SECTION_BONUSES[pipCategory]) || 0;
        const pipsPerLevel = (typeof CATEGORY_PIPS_PER_LEVEL !== 'undefined' && CATEGORY_PIPS_PER_LEVEL[pipCategory]) || 0;
        const pips = basePips + (level * (pipsPerLevel || 0));
        const perLevel = typeof WORSHIP_FAVOUR_PER_LEVEL !== 'undefined' ? WORSHIP_FAVOUR_PER_LEVEL : 25;
        const favour = (typeof BASE_FAVOUR !== 'undefined' ? BASE_FAVOUR : 100) + level * perLevel * (this.state.worshipLevelFavourScale ?? 1);
        return { pips, favour };
    }

    getGodForCategory(category) {
        if (typeof DevotionUtils !== 'undefined') {
            return DevotionUtils.getGodForCategory(this.state, category);
        }
        return typeof GodUtils !== 'undefined' ? GodUtils.getGodForCategory(category) : null;
    }

    _getScoringFacesAndCounts() {
        return typeof GnosisDisplay !== 'undefined'
            ? GnosisDisplay.getFacesAndCounts(this.state)
            : { faces: [], counts: {} };
    }

    getGnosisDicePips(category, isValid) {
        if (!isValid) return 0;
        return typeof GnosisDisplay !== 'undefined'
            ? GnosisDisplay.getDicePips(category, this.state)
            : 0;
    }

    getGnosisCategoryPipBonus(category, counts = {}) {
        return typeof GnosisDisplay !== 'undefined'
            ? GnosisDisplay.getCategoryPipBonus(category, this.state, counts)
            : 0;
    }

    formatGnosisPipsLabel(category, counts = null) {
        return typeof GnosisDisplay !== 'undefined'
            ? GnosisDisplay.formatPipsLabel(category, this.state, counts)
            : 'pips';
    }

    /**
     * Gnosis live line: preview hover vs completed pantheon slot ("Offering Sixes" / "Fours offered to Hera").
     * @param {string|null|undefined} category
     * @param {boolean} filledSlot - category already has a score on the card (or scoring animation: treat as made)
     */
    getLiveOfferingTitle(category, filledSlot) {
        if (!category) return 'Offering';
        const displayCat = typeof DevotionUtils !== 'undefined'
            ? DevotionUtils.getDisplayCategory(this.state, category)
            : (category === 'Yahtzee' ? 'Five of a Kind' : category);
        if (filledSlot) {
            const g = this.getGodForCategory(category);
            const godShown = g === "Pandora's Box" ? 'Pandora' : (g || '—');
            return `${displayCat} offered to ${godShown}`;
        }
        return `Offering ${displayCat}`;
    }

    // Turn and ante progression
    nextTurn() {
        // Apply TURN_END boon effects before advancing turn (Balatro-inspired timing)
        this.state.boons.forEach(boon => {
            boon.onTimingEvent('turn_end', this.state, undefined, this);
        });
        
        // Reset boon trigger counter for Eruption of Etna
        this.state.boonTriggersThisTurn = 0;
        
        this.state.turn++;
        
        // Base rolls plus the Tyche line; turn_start boon effects may still modify it.
        this.state.rollsLeft = ArtifactEffects.rollsPerTurn(this.state);
        
        // Apply TURN_START effects AFTER setting default rolls (so Kronos can override)
        this.state.boons.forEach(boon => {
            boon.onTimingEvent('turn_start', this.state, undefined, this);
        });
        
        // Reset turn state
        this.state.hasRolled = false;
        this.state.held.fill(false);
        this.state.dice.forEach(die => {
            die.reset();
            die.resetTempModifier();
        });
        
        this.ensureLiveScore()?.updateDisplay(null);
        
        if (this.state.turn > this.state.maxTurns) {
            this.endAnte();
        } else if (BlindDirector.shopTurns.includes(this.state.turn) && !this.state.winningTestMode) {
            // Show gold + interest calculation in Gnosis BEFORE opening shop (skipped in winning test mode)
            this.showInterestThenOpenShop();
        } else if (this.domReady) {
            this.updateAllUI();
        }

        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('turn_tick', PlaytestRecorder.captureState(this));
        }
    }

    /**
     * Compute effective max turns based on unlocked categories.
     * Base 13 + one per unlocked high category (Sevens, Eights, Nines).
     */
    updateMaxTurns() {
        const base = GAME_BALANCE.MAX_TURNS_PER_ANTE;
        const highCount = (typeof UNLOCKABLE_SCORE_ROWS !== 'undefined'
            ? UNLOCKABLE_SCORE_ROWS
            : ['Sevens', 'Eights', 'Nines', 'Heureka', 'Extra Long Straight']
        ).filter(
            c => this.state.unlockedCategories?.[c]
        ).length;
        this.state.maxTurns = base + highCount;
    }

    areAllCategoriesFilled() {
        return TrialCompletion.areAllCategoriesFilled(this.state);
    }

    canDepartEarly() {
        return TrialCompletion.canDepartEarly(this.state);
    }

    /** Hubris: clear Trial early when over threshold; unfilled slots stay empty. */
    departEarly() {
        TrialCompletion.departEarly(this);
    }

    endAnte() {
        TrialCompletion.endAnte(this);
    }

    runEndOfAnteTallyThenOpenShop(tally) {
        TrialCompletion.runEndOfAnteTallyThenOpenShop(this, tally);
    }

    finishAnteAndOpenShop(opts = {}) {
        TrialCompletion.finishAnteAndOpenShop(this, opts);
    }

    /** Recompute artifact-derived stats. Safe to call repeatedly — see ArtifactEffects. */
    applyArtifactEffects() {
        ArtifactEffects.apply(this.state);

        // Reset when the late-trial condition lapses so ×2 cannot leak into the next trial.
        const hasTrojanHorseBoon = this.state.boons?.some(j => j.id === 'trojan_horse');
        const trojanActive = hasTrojanHorseBoon && this.state.turn >= 11;
        this.state.boonMultiplier = trojanActive ? 2 : 1;
        if (trojanActive) Logger.info(`Trojan Horse BOON activated! All boons ×2 (Turn ${this.state.turn})`);
    }

    // UI Updates (this will be called by UIManager)
    /**
     * Refresh all gameplay UI. Coalesced with requestAnimationFrame so multiple calls
     * in the same frame result in a single render (buttery smoothness).
     * @param {boolean} [immediate=false] - If true, bypass coalescing (e.g. loadGame, modal open)
     */
    updateAllUI(immediate = false) {
        if (!this.uiManager || !this.domReady) return;
        if (!this.dom.diceContainer || !this.dom.rollButton) {
            if (this.dom.diceContainer || this.dom.rollButton) Logger.debug('Game elements not ready, skipping UI update');
            return;
        }
        const run = () => {
            this.uiManager.updateAll(this.state, this);
            this._updateAllUIScheduled = false;
        };
        if (immediate) {
            if (this._updateAllUIScheduled && this._updateAllUIRafId != null) {
                cancelAnimationFrame(this._updateAllUIRafId);
            }
            this._updateAllUIScheduled = false;
            run();
            return;
        }
        if (this._updateAllUIScheduled) return;
        this._updateAllUIScheduled = true;
        this._updateAllUIRafId = requestAnimationFrame(run);
    }

    scheduleLiveScorePreview(category) {
        this.ensureLiveScore()?.schedulePreview(category);
    }

    cancelLiveScorePreview() {
        this.ensureLiveScore()?.cancelPreview();
    }

    updateLiveScoreValues(el, o) {
        this.ensureLiveScore()?.updateValues(el, o);
    }

    updateLiveScoreDisplay(category) {
        this.ensureLiveScore()?.updateDisplay(category);
    }

    // Utility methods
    /**
     * Display a message to the user
     * @param {string} text - Message to display
     * @param {number} [duration=3000] - How long to show message (ms)
     */
    showMessage(text, duration = 3000) {
        if (this.domReady && this.dom.messagePopup) {
            this.dom.messagePopup.textContent = text;
            this.dom.messagePopup.classList.add('show');
            setTimeout(() => {
                this.dom.messagePopup.classList.remove('show');
            }, duration);
        }
    }

    /**
     * Calculate interest earned based on saved gold (Balatro-inspired)
     * @returns {number} Interest gold earned
     */
    calculateInterest() {
        return this.calculateInterestOnAmount(this.state.gold);
    }

    calculateInterestOnAmount(goldAmount) {
        const hasGoldenTouch = this.state.boons?.some(j => j.id === 'golden_touch');
        const interestRate = hasGoldenTouch ? 3 : GAME_BALANCE.INTEREST_RATE;
        return Math.min(
            Math.floor(goldAmount / interestRate),
            ArtifactEffects.maxInterest(this.state)
        );
    }

    showInterestThenOpenShop(opts = {}) {
        this.ensureLiveScore()?.showInterestThenOpenShop(opts);
    }

    openShop() {
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('shop_open', { gold: this.state.gold, turn: this.state.turn, ante: this.state.ante });
        }
        if (this.shopManager) {
            this.shopManager.openShop(this.state, this);
        }
    }

    closeShop() {
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('shop_close', { turn: this.state.turn, ante: this.state.ante, gold: this.state.gold });
        }
        if (this.sound) this.sound.play('cardSlide2', { pitch: 0.95, volume: 0.45 });
        if (this.shopManager) {
            this.shopManager.closeShop(this);
        } else if (this.uiManager) {
            this.uiManager.closeShop();
        } else {
            Logger.error('No shop manager available to close shop');
            return;
        }
        
        if (this.state.turn === 1 && this.state.scorecard && Object.keys(this.state.scorecard).length === 0) {
            this.startAnte();
        }
        
        // Refresh UI after stage swap so boons/inventory render correctly
        this.updateAllUI();
    }

    rerollShop() {
        if (this.shopManager) {
            this.shopManager.rerollShop(this.state, this);
        }
    }

    /**
     * Check if game is in a safe state to save
     * Validates valid state, not processing. Saves allowed in shop for resume.
     * @returns {boolean} True if safe to save
     */
    canSave() {
        // Check for invalid game state
        if (!this.state || this.state.gameOver === undefined) {
            Logger.error('Cannot save: Invalid game state');
            return false;
        }
        
        // Check if dice array is valid
        const expectedDice = typeof ArtifactDice !== 'undefined'
            ? ArtifactDice.expectedCount(this.state)
            : (typeof GAME_BALANCE !== 'undefined' ? GAME_BALANCE.STARTING_DICE_COUNT : 5);
        if (!Array.isArray(this.state.dice) || this.state.dice.length !== expectedDice) {
            Logger.error('Cannot save: Invalid dice array');
            return false;
        }
        
        return true;
    }

    static get DEFAULT_WORSHIP_LEVELS() {
        return GamePersistence.DEFAULT_WORSHIP_LEVELS;
    }

    serializeStateForSave(state) {
        return GamePersistence.serialize(state);
    }

    saveGame() {
        return GamePersistence.save(this);
    }

    /**
     * Update state.resumePhase from current UI (shop vs play)
     */
    updateResumePhase() {
        if (!this.state) return;
        const shopStage = document.getElementById('shopStage');
        const inShop = shopStage && !shopStage.classList.contains('hidden');
        this.state.resumePhase = inShop ? 'shop' : 'play';
    }

    rehydrateState(plain, prngState = null) {
        return GamePersistence.rehydrate(this, plain, prngState);
    }

    /**
     * Load a saved game from localStorage (Balatro: G.FUNCS.start_run with savetext)
     * Restores PRNG state, boons, consumables, and resume phase (shop vs play)
     * @returns {boolean} True if load was successful
     */
    loadGame() {
        const saved = this.dataManager.loadGame();
        if (!saved || !saved.gameState) return false;
        this.state = this.rehydrateState(saved.gameState, saved.prngState);
        this.state.resumePhase = saved.resumePhase ?? this.state.resumePhase ?? 'play';
        this.updateMaxTurns(); // Recompute for unlocked Sevens/Eights/Nines
        this.applyArtifactEffects(); // Recompute boonSlots, shopPriceMultiplier from artifacts
        this.updateAllUI(true); // Immediate: restore from save
        if (this.state.resumePhase === 'shop' && this.uiManager) {
            // Return to shop: show shop stage and regenerate stock (PRNG restored = same stock)
            this.uiManager.openShop(this.state, this);
        }
        return true;
    }

    /**
     * Format favour / mult for live score (numeric only; × sits between pips and favour in DOM).
     * @param {number} favour
     * @returns {string}
     */
    formatFavour(favour) {
        return (this.numberFormat
            ? this.numberFormat.favour(favour, { prefix: false })
            : String((Number(favour) || 100) / 100));
    }

    /**
     * Format favour contribution for display – shows actual value (0.5, 1.5, etc.).
     * Used when showing what a boon added (e.g. "+0.5 Favour" in popup or live score).
     * @param {number} favour - Engine Favour (hundredths)
     * @returns {string} Player-facing Favour (naked = 1)
     */
    formatFavourContrib(favour) {
        return (this.numberFormat ? this.numberFormat.favourContrib(favour) : String((Number(favour) || 0) / 100));
    }

    /**
     * Balatro-style tiered display format for pips / score-preview / total.
     * Routes through this.numberFormat so tier boundaries and commas/scientific
     * are centralised in one place (see game/js/utils/NumberFormat.js).
     * @param {number} n
     * @returns {string}
     */
    formatDisplay(n) {
        return (this.numberFormat ? this.numberFormat.display(n) : String(Math.trunc(Number(n) || 0)));
    }
}