// LibationCard class - Represents libation cards that modify game mechanics

class LibationCard extends Card {
    constructor(data) {
        super(data);
        this.type = 'libation';
        this.ruleType = data.ruleType || 'libation'; // 'scoring', 'dice', 'libation'
        this.effectType = data.effectType || 'instant'; // 'instant', 'hand', 'next_hand', 'ante'
        this.maxUses = data.maxUses || 1; // Most libations are single-use
        this.usesLeft = data.usesLeft || this.maxUses;
        this.timing = data.timing || 'anytime'; // 'anytime', 'before_roll', 'after_roll', 'before_score'
    }

    /**
     * @param {Object} [gameState] - passed so Ganymede's Cup can count this pour
     */
    use(gameState) {
        const ok = super.use();
        if (ok && typeof ArtifactEffects !== 'undefined') {
            ArtifactEffects.noteLibationPour(gameState, this.id);
        }
        return ok;
    }

    // Apply the specific rule of this libation card
    applyRule(gameState, gameEngine = null) {
        if (!this.canUse()) return false;

        let consumed = false;
        switch (this.ruleType) {
            case 'scoring':
                this.applyScoringModification(gameState);
                consumed = true;
                break;
            case 'dice':
                this.applyDiceModification(gameState);
                consumed = true;
                break;
            case 'libation':
                consumed = this.applyLibationEffect(gameState, gameEngine);
                break;
            default:
                Logger.warn('Unknown rule type - libation may not function correctly', { ruleType: this.ruleType });
                return false;
        }

        if (consumed) {
            this.use(gameState);
            return true;
        }
        return false; // Die-targeting: consume when user selects a die
    }

    // Apply specific rule effects based on rule type
    applySpecificRule(gameState) {
        switch (this.ruleType) {
            case 'dice_modification':
                this.applyDiceModification(gameState);
                break;
            case 'scoring_modification':
                this.applyScoringModification(gameState);
                break;
            case 'turn_modification':
                this.applyTurnModification(gameState);
                break;
            case 'shop_modification':
                this.applyShopModification(gameState);
                break;
            case 'libation':
                this.applyLibationEffect(gameState);
                break;
        }
    }

    // Apply dice-related libation effects
    applyDiceModification(gameState) {
        switch (this.id) {
            case 'wild_dice':
                // Allow any die to be treated as any value
                gameState.diceEffects = gameState.diceEffects || {};
                gameState.diceEffects.wildDice = true;
                break;
                
            case 'exploding_dice':
                // Rolling max value on a die lets you roll it again
                gameState.diceEffects = gameState.diceEffects || {};
                gameState.diceEffects.explodingDice = true;
                break;
                
            case 'advantage_dice':
                // Roll 3 dice, keep best 2
                gameState.diceEffects = gameState.diceEffects || {};
                gameState.diceEffects.advantageDice = true;
                break;
        }
    }

    // Apply scoring-related libation effects
    applyScoringModification(gameState) {
        switch (this.id) {
            case 'bonus_yahtzee':
                // Yahtzee gives bonus points
                gameState.scoringBonuses = gameState.scoringBonuses || {};
                gameState.scoringBonuses.bonusYahtzee = 50;
                break;
                
            case 'straight_bonus':
                // Straights give extra points
                gameState.scoringBonuses = gameState.scoringBonuses || {};
                gameState.scoringBonuses.straightBonus = 10;
                break;
                
            case 'full_house_bonus':
                // Full House gives extra points
                gameState.scoringBonuses = gameState.scoringBonuses || {};
                gameState.scoringBonuses.fullHouseBonus = 25;
                break;
        }
    }

    // Apply turn-related libation effects
    applyTurnModification(gameState) {
        switch (this.id) {
            case 'extra_rolls':
                // Start with extra rolls
                gameState.startingRolls = (gameState.startingRolls || 3) + 1;
                break;
                
            case 'unlimited_rolls':
                // No limit on rolls per turn
                gameState.diceEffects = gameState.diceEffects || {};
                gameState.diceEffects.unlimitedRolls = true;
                break;
                
            case 'free_hold':
                // First hold each turn is free
                gameState.diceEffects = gameState.diceEffects || {};
                gameState.diceEffects.freeHold = true;
                break;
        }
    }

    // Apply shop-related libation effects
    applyShopModification(gameState) {
        switch (this.id) {
            case 'discount_day':
                // All shop items cost 1 less
                gameState.shopBonuses = gameState.shopBonuses || {};
                gameState.shopBonuses.discount = 1;
                break;
                
            case 'free_pack':
                // First pack each run is free
                gameState.shopBonuses = gameState.shopBonuses || {};
                gameState.shopBonuses.freePack = true;
                break;
                
            case 'better_odds':
                // Better odds for rare cards
                gameState.shopBonuses = gameState.shopBonuses || {};
                gameState.shopBonuses.betterOdds = true;
                break;
        }
    }

    // Apply libation effects from CSV database
    // @returns {boolean} true if effect consumed immediately; false if awaiting die selection (consume on selection)
    applyLibationEffect(gameState, gameEngine = null) {
        const engine = gameEngine || window.game;

        switch (this.id) {
            case 'kyphi_mead':
                this.promptForDieFaceSelection(gameState, 'parchment', gameEngine);
                return false;
            case 'tisane_hephaestus':
                this.promptForDieFaceSelection(gameState, 'iron', gameEngine);
                return false;
            case 'ambrosial_krasi':
                this.promptForDieFaceSelection(gameState, 'gold', gameEngine);
                return false;
            case 'retsina_echoes':
                this.promptForDieFaceSelection(gameState, 'mother_of_pearl', gameEngine);
                return false;
            case 'soma_wild':
                this.promptForDieFaceSelection(gameState, 'wild', gameEngine);
                return false;
            case 'kylix_hermit': {
                const gain = Math.min(gameState.gold, 20);
                gameState.gold += gain;
                engine?.showMessage?.(`Kylix of the Hermit: +${gain} gold (double, max gain 20)!`);
                return true;
            }
            case 'elixir_lethe':
                this.promptForDieFaceSelection(gameState, 'permanent_reduce', gameEngine);
                return false;
            case 'chalice_helios':
                this.promptForDieFaceSelection(gameState, 'permanent_increase', gameEngine);
                return false;
            case 'the_eucharist': {
                const gods = Object.keys(gameState.worshipLevels || {}).filter(g => g !== "Pandora's Box");
                if (gods.length > 0) {
                    this.enterEucharistTargetingMode(gameState, gameEngine);
                } else {
                    engine?.showMessage?.("The Eucharist: No gods available to worship!");
                }
                return false;
            }
            case 'divine_guidance': {
                const availableGods = Object.keys(gameState.worshipLevels || {});
                if (availableGods.length >= 2) {
                    const shuffledGods = [...availableGods].sort(() => engine.prng.random() - 0.5);
                    const god1 = shuffledGods[0];
                    const god2 = shuffledGods[1];
                    gameState.worshipLevels[god1] = (gameState.worshipLevels[god1] || 0) + 1;
                    gameState.worshipLevels[god2] = (gameState.worshipLevels[god2] || 0) + 1;
                    engine?.showMessage?.(`Divine Guidance: ${god1} and ${god2} worship increased by 1 each!`);
                } else if (availableGods.length === 1) {
                    const god = availableGods[0];
                    gameState.worshipLevels[god] = (gameState.worshipLevels[god] || 0) + 2;
                    engine?.showMessage?.(`Divine Guidance: ${god} worship increased by 2!`);
                } else {
                    engine?.showMessage?.("Divine Guidance: No gods available to worship!");
                }
                return true;
            }
            default:
                return false;
        }
    }

    // Prompt user to select a die face for enhancement (non-overlay: act directly on dice in diceContainer)
    promptForDieFaceSelection(gameState, enhancementType, gameEngine = null) {
        const engine = gameEngine || window.game;
        if (!gameState.hasRolled) {
            engine?.showMessage?.('Roll the dice first, then click a die to enhance.');
            return;
        }
        const enhancementNames = {
            'parchment': 'Parchment',
            'iron': 'Clockwork',
            'gold': 'Gold',
            'mother_of_pearl': 'Mother of Pearl',
            'mirror': 'Mirror',
            'wild': 'Wild',
            'permanent_reduce': 'Permanently Reduce by 1',
            'permanent_increase': 'Permanently Increase by 1'
        };
        const enhancementName = enhancementNames[enhancementType];
        engine?.showMessage?.(`${this.name}: Click a die on the table to apply ${enhancementName}!`);

        // Enter targeting mode: user clicks dice directly in diceContainer (no overlay)
        this.enterLibationTargetingMode(gameState, enhancementType, gameEngine);
    }

    /**
     * Enter libation targeting mode: dice in diceContainer become clickable (non-overlay)
     * User clicks a die directly to apply enhancement.
     */
    enterLibationTargetingMode(gameState, enhancementType, gameEngine = null) {
        const engine = gameEngine || window.game;
        if (!engine) return;
        engine.state.libationTargetingMode = { libation: this, enhancementType };
        if (engine.updateAllUI) engine.updateAllUI();
    }

    /**
     * Create Balatro-style die face selection UI (LEGACY - kept for reference; no longer used)
     * Clean, elegant overlay similar to Balatro's tarot card selection
     * @param {Object} gameState - Current game state
     * @param {string} enhancementType - Type of enhancement to apply
     * @param {Object} gameEngine - Game engine reference
     */
    createDieFaceSelectionUI(gameState, enhancementType, gameEngine = null) {
        const enhancementNames = {
            'parchment': 'Parchment',
            'iron': 'Clockwork',
            'gold': 'Gold',
            'mother_of_pearl': 'Mother of Pearl',
            'mirror': 'Mirror',
            'wild': 'Wild',
            'permanent_reduce': 'Reduce Value (-1)',
            'permanent_increase': 'Increase Value (+1)'
        };
        
        const enhancementDescriptions = {
            'parchment': '+1 Pip when scored',
            'iron': 'x1.5 Favour if not selected',
            'gold': '+3 Gold when scored',
            'mother_of_pearl': 'Adds left or right die value (50/50)',
            'mirror': 'Scores twice (like Balatro Red Seal), including enhancements',
            'wild': 'Randomly becomes -1, 0, or +1 of rolled value',
            'permanent_reduce': 'Permanently decrease face value',
            'permanent_increase': 'Permanently increase face value'
        };

        const enhancementName = enhancementNames[enhancementType];
        const enhancementDesc = enhancementDescriptions[enhancementType];

        // Create Balatro-style overlay
        const overlay = document.createElement('div');
        overlay.className = 'balatro-enhancement-overlay';
        overlay.style.opacity = '0';

        const modal = document.createElement('div');
        modal.className = 'balatro-enhancement-modal';

        // Get dice faces (use current rolled faces if available, otherwise show 1-6)
        const diceFaces = gameState.dice.map((die, index) => {
            if (gameState.hasRolled) {
                return die.getEffectiveFace();
            } else {
                // Show default faces 1-6 if dice haven't been rolled
                return (index % 6) + 1;
            }
        });

        // Build the clean Balatro-style UI
        modal.innerHTML = `
            <div class="enhancement-header">
                <h2 class="enhancement-title">${this.name}</h2>
                <div class="enhancement-subtitle">
                    <span class="enhancement-name">${enhancementName}</span>
                    <span class="enhancement-description">${enhancementDesc}</span>
                </div>
            </div>
            
            <div class="enhancement-instruction">Select a die face to enhance</div>
            
            <div class="balatro-dice-grid">
                ${gameState.dice.map((die, index) => {
                    const face = diceFaces[index];
                    const dieId = die.dieId || (index + 1);
                    
                    // Check if die already has enhancements on this face
                    const faceEnhancements = die.faces[face]?.enhancements || [];
                    const hasEnhancement = faceEnhancements.length > 0;
                    const enhancementBadge = hasEnhancement ? 
                        `<div class="die-enhancement-badge">${faceEnhancements[0]}</div>` : '';
                    
                    return `
                        <div class="balatro-die-option" 
                             data-die-index="${index}" 
                             data-face="${face}"
                             data-die-id="${dieId}">
                            <div class="die-card">
                                <div class="die-card-inner">
                                    <div class="die-face-large" data-face="${face}"></div>
                                    ${enhancementBadge}
                                </div>
                                <div class="die-card-label">
                                    <span class="die-number">Die ${dieId}</span>
                                    <span class="die-face-value">Face: ${face}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="enhancement-actions">
                <button class="balatro-button cancel-button" id="cancelEnhancement">
                    <span>Cancel</span>
                </button>
            </div>
        `;

        // Add smooth fade-in animation
        requestAnimationFrame(() => {
            overlay.style.transition = 'opacity 0.3s ease-in-out';
            overlay.style.opacity = '1';
        });

        // Add click handlers for die selection (Balatro-style)
        const dieOptions = modal.querySelectorAll('.balatro-die-option');
        dieOptions.forEach((option, idx) => {
            // Staggered entrance animation
            option.style.animationDelay = `${idx * 0.05}s`;
            
            option.addEventListener('click', () => {
                const dieIndex = parseInt(option.dataset.dieIndex);
                const targetFace = parseInt(option.dataset.face);
                
                // Add selection animation
                option.classList.add('selected');
                if (window.soundManager) window.soundManager.play('foil1', { pitch: 0.95 + Math.random() * 0.1, volume: 0.55 });
                
                // Apply enhancement after brief animation
                setTimeout(() => {
                    this.applyEnhancementToDie(gameState, dieIndex, enhancementType, targetFace, gameEngine);
                    
                    // Fade out and remove
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        if (overlay.parentNode) {
                            document.body.removeChild(overlay);
                        }
                    }, 300);
                }, 200);
            });
            
            // Hover effects (Balatro-style)
            option.addEventListener('mouseenter', () => {
                option.classList.add('hovered');
            });
            
            option.addEventListener('mouseleave', () => {
                option.classList.remove('hovered');
            });
        });

        // Cancel button handler
        const cancelButton = modal.querySelector('#cancelEnhancement');
        cancelButton.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.play('cancel', { volume: 0.45 });
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    document.body.removeChild(overlay);
                }
            }, 300);
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    // Apply enhancement to a specific die (face-specific where relevant)
    applyEnhancementToDie(gameState, dieIndex, enhancementType, targetFaceValue, gameEngine = null) {
        // Validate die exists
        const die = gameState.dice[dieIndex];
        if (!die) {
            const engine = gameEngine || window.game;
            engine?.showMessage?.('Invalid die selected!');
            Logger.error('Invalid die index', { dieIndex });
            return;
        }

        // Validate die has required methods
        if (typeof die.isValidFace !== 'function') {
            Logger.error('Die object missing validation methods');
            const engine = gameEngine || window.game;
            engine?.showMessage?.('Die validation error!');
            return;
        }

        let message = '';
        const dieNumber = dieIndex + 1;
        const requestedFace = parseInt(targetFaceValue, 10);
        const isFaceRewriter = enhancementType === 'permanent_reduce' || enhancementType === 'permanent_increase';
        const targetFace = isFaceRewriter ? die.currentFace : requestedFace;
        
        // Validate target face using die's validation method
        if (!die.isValidFace(targetFace)) {
            const engine = gameEngine || window.game;
            const errorMsg = `Invalid face value: ${targetFaceValue}. Must be 1-9.`;
            engine?.showMessage?.(errorMsg);
            Logger.warn('Invalid face value', { targetFaceValue });
            return;
        }

        switch (enhancementType) {
            case 'parchment':
                if (die.addFaceEnhancement(targetFace, 'parchment')) {
            
                    message = `Die ${dieNumber} face ${targetFace} enhanced with Parchment (25% +100 Favour, 15% +5 Gold).`;
                } else {
                    message = 'Failed to apply parchment enhancement!';
                }
                break;
            case 'iron':
                if (die.addFaceEnhancement(targetFace, 'iron')) {
                    message = `Die ${dieNumber} face ${targetFace} enhanced with Clockwork (+5 Pips when scored).`;
                } else {
                    message = 'Failed to apply iron enhancement!';
                }
                break;
            case 'gold':
                if (die.addFaceEnhancement(targetFace, 'gold')) {
            
                    message = `Die ${dieNumber} face ${targetFace} enhanced with Gold (+1 Gold when scored).`;
                } else {
                    message = 'Failed to apply gold enhancement!';
                }
                break;
            case 'mother_of_pearl':
                if (die.addFaceEnhancement(targetFace, 'mother_of_pearl')) {
                    message = `Die ${dieNumber} face ${targetFace} enhanced with Mother of Pearl (adds left/right die value).`;
                } else {
                    message = 'Failed to apply mother of pearl enhancement!';
                }
                break;
            case 'mirror':
                if (die.addFaceEnhancement(targetFace, 'mirror')) {
            
                    message = `Die ${dieNumber} face ${targetFace} enhanced with Mirror (scores twice, including enhancements).`;
                } else {
                    message = 'Failed to apply mirror enhancement!';
                }
                break;
            case 'wild':
                if (die.addFaceEnhancement(targetFace, 'wild')) {
                    message = `Die ${dieNumber} face ${targetFace} enhanced with Wild (becomes ±1 or same when rolled).`;
                } else {
                    message = 'Failed to apply wild enhancement!';
                }
                break;
            case 'permanent_reduce':
                // Modify the specific face value using validated method
                if (die.modifyFaceValue(targetFace, -1)) {
                    message = `Die ${dieNumber} face ${targetFace} permanently reduced by 1!`;
                } else {
                    message = `Failed to modify die face ${targetFace}. Invalid face value.`;
                    const engine = gameEngine || window.game;
                    engine?.showMessage?.(message);
                }
                break;
            case 'permanent_increase':
                // Modify the specific face value using validated method
                if (die.modifyFaceValue(targetFace, +1)) {
                    message = `Die ${dieNumber} face ${targetFace} permanently increased by 1!`;
                } else {
                    message = `Failed to modify die face ${targetFace}. Invalid face value.`;
                    const engine = gameEngine || window.game;
                    engine?.showMessage?.(message);
                }
                break;
        }

        // Clean up temporary rolled face
        delete die.tempRolledFace;
        
        // Save the game state to persist enhancements
        const engine = gameEngine || window.game;
        if (engine && engine.saveGame) {
            engine.saveGame({ silent: true });
        }

        engine?.showMessage?.(message);
        
        // Update UI to reflect changes
        if (engine && engine.updateAllUI) {
            engine.updateAllUI();
        }
        
        // Log the enhancement for debugging

    }

    /**
     * Die-face enhancement libations (drag onto a die or click a die while targeting).
     * @param {LibationCard} libation
     * @returns {string|null} enhancementType for applyEnhancementToDie, or null
     */
    static getDieFaceEnhancementType(libation) {
        if (!(libation instanceof LibationCard)) return null;
        const map = {
            kyphi_mead: 'parchment',
            tisane_hephaestus: 'iron',
            ambrosial_krasi: 'gold',
            retsina_echoes: 'mother_of_pearl',
            soma_wild: 'wild',
            elixir_lethe: 'permanent_reduce',
            chalice_helios: 'permanent_increase',
        };
        return map[libation.id] ?? null;
    }

    /** Libations dragged onto dice (enhancement / face maintenance). */
    static isDieFaceEnhancer(libation) {
        return !!LibationCard.getDieFaceEnhancementType(libation);
    }

    // Check if this libation can be used
    canUse() {
        // Libations can be used once (usesLeft = 1)
        return super.canUse();
    }

    // Get description of the rule effect
    getRuleDescription() {
        return this.ruleEffect || this.description;
    }

    // Check if this rule is currently active
    isActive() {
        return this.active;
    }

    // Deactivate the rule (for game reset)
    deactivate() {
        this.active = false;
        this.used = false;
    }

    // Get all available libation cards
    static getAllLibationCards() {
        return [
            {
                id: 'wild_dice',
                name: 'Wild Dice',
                ruleType: 'dice_modification',
                ruleEffect: 'Any die can be treated as any value',
                rarity: 'rare',
                cost: 8,
                description: 'The dice become wild and unpredictable.',
                image: 'wild_dice.png'
            },
            {
                id: 'exploding_dice',
                name: 'Exploding Dice',
                ruleType: 'dice_modification',
                ruleEffect: 'Rolling max value lets you roll that die again',
                rarity: 'uncommon',
                cost: 6,
                description: 'Perfect rolls create chain reactions.',
                image: 'exploding_dice.png'
            },
            {
                id: 'advantage_dice',
                name: 'Advantage Dice',
                ruleType: 'dice_modification',
                ruleEffect: 'Roll 3 dice, keep the best 2',
                rarity: 'common',
                cost: 4,
                description: 'The gods favor the bold.',
                image: 'advantage_dice.png'
            },
            {
                id: 'bonus_yahtzee',
                name: 'Heureka Bonus',
                ruleType: 'scoring_modification',
                ruleEffect: 'Heureka gives +50 bonus points',
                rarity: 'rare',
                cost: 10,
                description: 'Perfect unity is greatly rewarded.',
                image: 'bonus_yahtzee.png'
            },
            {
                id: 'straight_bonus',
                name: 'Straight Bonus',
                ruleType: 'scoring_modification',
                ruleEffect: 'Straights give +10 bonus points',
                rarity: 'uncommon',
                cost: 5,
                description: 'Order is its own reward.',
                image: 'straight_bonus.png'
            },
            {
                id: 'extra_rolls',
                name: 'Extra Rolls',
                ruleType: 'turn_modification',
                ruleEffect: 'Start each turn with +1 roll',
                rarity: 'common',
                cost: 3,
                description: 'More chances to find perfection.',
                image: 'extra_rolls.png'
            },
            {
                id: 'discount_day',
                name: 'Discount Day',
                ruleType: 'shop_modification',
                ruleEffect: 'All shop items cost 1 less gold',
                rarity: 'uncommon',
                cost: 6,
                description: 'The market favors the faithful.',
                image: 'discount_day.png'
            }
        ];
    }

    // Create libation card from data
    static fromData(data) {
        return new LibationCard(data);
    }

    // Get libation card by ID
    static getLibationCard(id) {
        const allCards = LibationCard.getAllLibationCards();
        return allCards.find(card => card.id === id);
    }

    // Create UI for god selection (for Eucharist)
    enterEucharistTargetingMode(gameState, gameEngine = null) {
        const engine = gameEngine || window.game;
        if (!engine) return;
        engine?.showMessage?.(`${this.name}: Click or drag onto a god on the Pantheon to increase worship!`);
        engine.state.eucharistTargetingMode = { libation: this };
        if (engine.updateAllUI) engine.updateAllUI();
    }

    createGodSelectionUI(gameState, gameEngine = null) {
        // LEGACY overlay - no longer used; use enterEucharistTargetingMode instead
        const engine = gameEngine || window.game;
        engine?.showMessage?.("The Eucharist: Select a god to increase worship level!");

        // Create overlay for god selection
        const overlay = document.createElement('div');
        overlay.className = 'enhancement-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.className = 'enhancement-modal';
        modal.style.cssText = `
            background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
            border: 2px solid #444;
            border-radius: 12px;
            padding: 20px;
            max-width: 600px;
            text-align: center;
            color: white;
            font-family: var(--font-ui), sans-serif;
        `;

        modal.innerHTML = `
            <h3 style="margin-bottom: 20px; color: #ffd700;">Select a God for Eucharist</h3>
            <p style="margin-bottom: 20px; opacity: 0.8;">Choose which god's worship level to increase by 1:</p>
            <div id="godSelectionButtons" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
            </div>
        `;

        const gods = Object.keys(gameState.worshipLevels || {});
        const buttonsContainer = modal.querySelector('#godSelectionButtons');

        gods.forEach(god => {
            const button = document.createElement('button');
            button.textContent = `${god} (Level ${gameState.worshipLevels[god] || 0})`;
            button.style.cssText = `
                padding: 10px 20px;
                margin: 5px;
                background: linear-gradient(135deg, #4a90e2, #357abd);
                border: none;
                border-radius: 6px;
                color: white;
                font-family: var(--font-ui), sans-serif;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;

            button.addEventListener('mouseenter', () => {
                button.style.background = 'linear-gradient(135deg, #357abd, #2e5a8a)';
                button.style.transform = 'scale(1.05)';
            });

            button.addEventListener('mouseleave', () => {
                button.style.background = 'linear-gradient(135deg, #4a90e2, #357abd)';
                button.style.transform = 'scale(1)';
            });

            button.addEventListener('click', () => {
                // Increase the selected god's worship level
                gameState.worshipLevels[god] = (gameState.worshipLevels[god] || 0) + 1;
                engine?.showMessage?.(`The Eucharist: ${god} worship increased by 1!`);
                
                // Remove the overlay
                document.body.removeChild(overlay);
                
                // Update UI
                engine?.updateAllUI?.();
            });

            buttonsContainer.appendChild(button);
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LibationCard;
}

