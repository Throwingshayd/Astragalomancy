/* exported Boon */
// Boon class - Represents Boons that provide ongoing effects

class Boon extends Card {
    constructor(data) {
        super(data);
        this.type = 'boon';
        this.triggers = data.triggers || ['score'];
        this.stackable = data.stackable || false;
        this.conditions = data.conditions || {};

        this.timing = data.timing || {
            'before_roll': false,
            'after_roll': false,
            'before_score': false,
            'after_score': false,
            'turn_start': false,
            'turn_end': false,
            'shop_enter': false,
            'shop_exit': false,
            'hand_effect': false
        };

        this.dynamicStats = {
            pips: 0,           // Extra pips provided (e.g., "+20 Pips")
            favour: 0,         // Multiplier bonus (e.g., "x3 Favour")
            gold: 0,           // Gold earned/bonus (e.g., "+5 Gold")
            other: null        // Custom stat (e.g., "3/5 Charges")
        };
        this.triggerPhase = data.triggerPhase || 'hand';
    }

    /**
     * Get seeded PRNG from game engine. All RNG in Boon must use this for determinism.
     * @param {Object|null} [game] - Explicit engine reference; falls back to the global engine singleton when omitted
     * @returns {Object|undefined} SeededRNG instance, or undefined if game not ready
     */
    _getPrng(game = null) {
        return (game || window.game)?.prng;
    }

    /**
     * Random integer in [0, max) using seeded RNG.
     * @param {number} max - Exclusive upper bound
     * @param {Object|null} [game] - Explicit engine reference; falls back to the global engine singleton when omitted
     * @returns {number}
     */
    _randomInt(max, game = null) {
        const prng = this._getPrng(game);
        return prng ? Math.floor(prng.random() * max) : 0;
    }

    /**
     * Random integer in [min, max] inclusive using seeded RNG.
     * @param {number} min - Inclusive lower bound
     * @param {number} max - Inclusive upper bound
     * @param {Object|null} [game] - Explicit engine reference; falls back to the global engine singleton when omitted
     * @returns {number}
     */
    _randomIntInclusive(min, max, game = null) {
        const prng = this._getPrng(game);
        return prng ? min + Math.floor(prng.random() * (max - min + 1)) : min;
    }

    // Main event handler - called when events occur in the game
    onEvent(event, gameState, eventData) {
        if (!this.canUse() || !this.triggers.includes(event)) {
            return eventData;
        }

        // Check conditions if any exist
        if (!this.checkConditions(gameState, eventData)) {
            return eventData;
        }

        // Apply the boon's effect
        const result = this.applyEffect(event, gameState, eventData);
        
        // Track usage
        if (result !== eventData) {
            this.use();
            this.totalValue += this.calculateValueAdded(eventData, result);
        }

        return result;
    }

    // Balatro-inspired timing system
    /** @param {Object|null} game - Explicit engine reference; falls back to the global engine singleton when omitted (e.g. pure ScoringEngine preview path) */
    onTimingEvent(timingEvent, gameState, eventData = null, game = null) {
        // Special handling for Proteus' Disguise - mimics other boons
        if (this.id === 'proteus_disguise') {
            return this.applyProteusEffect(timingEvent, gameState, eventData, game);
        }
        
        if (!this.canUse() || !this.timing[timingEvent]) {
            return eventData;
        }

        // Check conditions if any exist
        if (!this.checkConditions(gameState, eventData)) {
            return eventData;
        }

        // Track for Message in a Bottle: any boon other than Message in a Bottle triggers = had other boons this ante
        if (this.id !== 'message_in_a_bottle') {
            gameState.hadOtherBoonsThisAnte = true;
        }

        // Track boon triggers for Eruption of Etna
        if (timingEvent === 'before_score' && this.id !== 'eruption_of_etna') {
            gameState.boonTriggersThisTurn = (gameState.boonTriggersThisTurn || 0) + 1;
        }

        // Apply the boon's effect based on timing
        let result = this.applyTimingEffect(timingEvent, gameState, eventData, game);
        
        // Reflection of Narcissus: Apply effect a second time (but not for narcissus itself)
        const hasNarcissus = gameState.boons?.some(j => j.id === 'reflection_of_narcissus');
        if (hasNarcissus && this.id !== 'reflection_of_narcissus' && !gameState.narcissusDoubling) {
            gameState.narcissusDoubling = true; // Prevent infinite loops
            result = this.applyTimingEffect(timingEvent, gameState, result, game);
            gameState.narcissusDoubling = false;
        }
        
        // Track usage
        if (result !== eventData) {
            this.use();
            this.totalValue += this.calculateValueAdded(eventData, result);
        }

        return result;
    }

    // Apply effects based on timing events
    applyTimingEffect(timingEvent, gameState, eventData, game = null) {
        // For turn_start events, we don't need to track value changes
        if (timingEvent === 'turn_start') {
            this.applyTurnStartEffect(gameState, eventData || {}, game);
            return eventData; // Return unchanged to avoid value tracking
        }
        
        // For ante_end events, handle similarly
        if (timingEvent === 'ante_end') {
            this.applyAnteEndEffect(gameState, eventData || {}, game);
            return eventData;
        }
        
        // For sell events, handle similarly
        if (timingEvent === 'sell') {
            this.applySellEffect(gameState, eventData || {}, game);
            return eventData;
        }
        
        const result = eventData ? { ...eventData } : {};

        let processedResult;
        switch (timingEvent) {
            case 'before_roll':
                processedResult = this.applyBeforeRollEffect(gameState, result, game);
                break;
            case 'after_roll':
                processedResult = this.applyAfterRollEffect(gameState, result, game);
                break;
            case 'before_score':
                processedResult = this.applyBeforeScoreEffect(gameState, result, game);
                break;
            case 'after_score':
                processedResult = this.applyAfterScoreEffect(gameState, result, game);
                break;
            case 'turn_end':
                processedResult = this.applyTurnEndEffect(gameState, result, game);
                break;
            case 'shop_enter':
                processedResult = this.applyShopEnterEffect(gameState, result, game);
                break;
            case 'shop_exit':
                processedResult = this.applyShopExitEffect(gameState, result, game);
                break;
            case 'hand_effect':
                processedResult = this.applyHandEffect(gameState, result, game);
                break;
            default:
                processedResult = result;
                break;
        }
        
        // Apply The Trojan Horse artifact multiplier (if active)
        const multiplier = gameState.boonMultiplier || 1;
        if (multiplier !== 1 && processedResult) {
            if (processedResult.pips !== undefined) {
                processedResult.pips = Math.floor(processedResult.pips * multiplier);
                // EDGE CASE: Ensure pips never negative
                processedResult.pips = Math.max(0, processedResult.pips);
            }
            if (processedResult.favour !== undefined) {
                processedResult.favour = processedResult.favour * multiplier;
                // EDGE CASE: Ensure favour never negative
                processedResult.favour = Math.max(0, processedResult.favour);
            }
            if (processedResult.gold !== undefined) {
                processedResult.gold = Math.floor(processedResult.gold * multiplier);
            }
        }
        
        return processedResult;
    }

    // Check if conditions are met for activation
    checkConditions(gameState, eventData) {
        for (const [condition, value] of Object.entries(this.conditions)) {
            if (!this.checkCondition(condition, value, gameState, eventData)) {
                return false;
            }
        }
        return true;
    }

    // Check a specific condition
    checkCondition(condition, value, gameState, eventData) {
        switch (condition) {
            case 'category':
                return eventData.category === value;
            case 'minPips':
                return eventData.pips >= value;
            case 'maxPips':
                return eventData.pips <= value;
            case 'minDice':
                return gameState.dice.filter(d => d.face === value).length >= this.conditions.minCount;
            case 'turn':
                return gameState.turn === value;
            case 'ante':
                return gameState.ante === value;
            default:
                return true;
        }
    }

    // === TIMING-BASED EFFECT METHODS (Main Implementation) ===

    // Apply effects before rolling dice
    applyBeforeRollEffect(gameState, result, game = null) {
        const engine = game || window.game;
        switch (this.id) {
            case 'achilles_heel':
                // Achilles Heel: lose 1 Gold at the start of each roll
                if (gameState.gold > 0) {
                    gameState.gold -= 1;
                    engine?.showMessage?.("Achilles' Heel: -1 Gold!");
                }
                break;
            case 'prometheus_gift':
                // Prometheus' Gift: one less re-roll each turn
                gameState.rollsLeft = Math.max(1, gameState.rollsLeft - 1);
                engine?.showMessage?.("Prometheus' Gift: -1 re-roll!");
                break;
            
        }
        return result;
    }

    applyAfterRollEffect(gameState, result, game = null) {
        const engine = game || window.game;
        // Effects that trigger after dice are rolled
        switch (this.id) {
            case 'lucky_dice_bag':
                // Reroll any 1s automatically (once per die per turn)
                const prng = engine?.prng;
                if (prng) {
                    gameState.dice.forEach(die => {
                        if (die.face === 1 && !die.hasBeenRerolled) {
                            die.roll(prng);
                            die.hasBeenRerolled = true;
                            engine?.showMessage?.("Lucky Dice Bag: Rerolled a 1!");
                        }
                    });
                }
                break;
            
            case 'medusas_gaze':
                // Any die showing 6 cannot be rerolled (auto-hold)
                let medusaSixes = 0;
                gameState.dice.forEach(die => {
                    if (die.face === 6) {
                        die.held = true;
                        medusaSixes++;
                    }
                });
                if (medusaSixes > 0) {
                    engine?.showMessage?.(`Medusa's Gaze: ${medusaSixes} sixes held!`);
                }
                break;
            
            case 'the_locksmith':
                // Track rolls held for each die
                gameState.dice.forEach(die => {
                    if (die.held) {
                        die.rollsHeld = (die.rollsHeld || 0) + 1;
                    }
                });
                break;
            
            case 'reckless_abandon':
                // Force all dice to be unheld - no strategy allowed!
                gameState.dice.forEach(die => {
                    die.held = false;
                });
                break;
            
            case 'symmetry':
                // Detect palindromic dice patterns and add permanent favour
                const symmetryValues = gameState.dice.map(d => d.face);
                const isSymmetric = symmetryValues.every((val, idx) => 
                    val === symmetryValues[symmetryValues.length - 1 - idx]
                );
                
                if (isSymmetric) {
                    if (!this.symmetryFavour) {
                        this.symmetryFavour = 0;
                    }
                    this.symmetryFavour += 0.5;
                    
                    engine?.showMessage?.(`✨ Symmetry: Palindrome detected! [${symmetryValues.join('-')}] Card gains +0.5 Favour!`, 4000);
                    Logger.info(`Symmetry triggered! Pattern: [${symmetryValues.join('-')}], Total favour: ${this.symmetryFavour}`);
                }
                break;
            
            case 'typhon':
                // Check if this is the first roll of the turn and all dice show 1
                const isFirstRoll = (gameState.rollsLeft === (GAME_BALANCE.STARTING_ROLLS - 1));
                const allOnes = gameState.dice.every(die => die.face === 1);
                
                if (isFirstRoll && allOnes) {
                    const typhonBonus = Math.floor(gameState.scoreThreshold * 0.9);
                    gameState.typhonBonus = typhonBonus;
                    engine?.showMessage?.(`🌋 TYPHON AWAKENS! All 1s = +${typhonBonus} Pips!`, 6000);
                    Logger.info(`Typhon triggered! Incredibly rare event - 1 in 7,776 chance!`);
                }
                break;
            
            case 'smog_of_morpheus':
                // After final roll, transform 2s and 4s to 3s
                if (gameState.rollsLeft === 0) {
                    let morpheusTransformed = 0;
                    
                    gameState.dice.forEach(die => {
                        if (die.face === 2 || die.face === 4) {
                            die.face = 3;
                            morpheusTransformed++;
                        }
                    });
                    
                    if (morpheusTransformed > 0) {
                        engine?.showMessage?.(`Smog of Morpheus: ${morpheusTransformed} dice → 3 (final roll)!`, 3000);
                    }
                }
                break;
            
            case 'marathon_runner':
                // Increment pips after each roll
                if (!this.marathonPips) {
                    this.marathonPips = 0;
                }
                this.marathonPips += 1;
                
                // Update dynamic display to show progress towards 42km goal
                this.dynamicStats.pips = this.marathonPips;
                const scratchCount = this.marathonScratches || 0;
                this.dynamicStats.other = scratchCount > 0 ? `💀${scratchCount}/3` : `${this.marathonPips}/42`;
                break;
        }
        return result;
    }
    
    // Special handler for Proteus - Blueprint-style: copies the boon to its LEFT
    applyProteusEffect(timingEvent, gameState, eventData, game = null) {
        const boons = gameState.boons || [];
        const proteusIndex = boons.findIndex(j => j === this);
        if (proteusIndex <= 0) return eventData; // No boon to the left
        
        const leftBoon = boons[proteusIndex - 1];
        if (!leftBoon || !leftBoon.timing?.[timingEvent]) return eventData;
        
        try {
            return leftBoon.applyTimingEffect(timingEvent, gameState, eventData, game);
        } catch (error) {
            Logger.error(`Proteus failed to mimic ${leftBoon.name}:`, error);
            return eventData;
        }
    }

    applyBeforeScoreEffect(gameState, result, game = null) {
        if (typeof BoonTimingHandlers !== 'undefined' && typeof BoonTimingHandlers.runBeforeScore === 'function') {
            BoonTimingHandlers.runBeforeScore(this, gameState, result, game);
        } else {
            Logger.warn('BoonTimingHandlers.runBeforeScore missing — before_score skipped');
        }
        return result;
    }

    // Balatro-inspired timing effect methods
    applyAfterScoreEffect(gameState, result, game = null) {
        const engine = game || window.game;
        switch (this.id) {
            case 'charons_ferry_fare':
                // Gain +1 Gold after scoring any hand (does not trigger on a scratch)
                if (result.finalScore && result.finalScore > 0) {
                    if (engine && typeof engine.updateGoldAnimated === 'function') {
                        engine.updateGoldAnimated(1, "Charon's Ferry Fare");
                    } else {
                        gameState.gold += 1;
                    }
                    engine?.showMessage?.("Charon's Ferry Fare: +1 Gold!");
                }
                break;

            // === NEW BOONS - After Score ===
            case 'dionysus_revelry':
                // Dionysus' Revelry handled in scoring logic - allows 2 pairs to score as Full House
                // No after_score effect needed
                break;
            
            case 'gamblers_charm':
                // 50% chance +2 Gold, 50% chance lose 1 gold
                if (this._getPrng(game)?.random() < 0.5) {
                    if (engine && typeof engine.updateGoldAnimated === 'function') {
                        engine.updateGoldAnimated(2, "Gambler's Charm");
                    } else {
                        gameState.gold += 2;
                    }
                    engine?.showMessage?.("Gambler's Charm: +2 Gold! Lucky!");
                } else {
                    if (engine && typeof engine.updateGoldAnimated === 'function') {
                        engine.updateGoldAnimated(-1, "Gambler's Charm");
                    } else {
                        gameState.gold = Math.max(0, gameState.gold - 1);
                    }
                    engine?.showMessage?.("Gambler's Charm: -1 Gold! Unlucky!");
                }
                break;
            
            case 'early_bird':
                // Turns 4-5: +2 Gold
                if (gameState.turn === 4 || gameState.turn === 5) {
                    if (engine && typeof engine.updateGoldAnimated === 'function') {
                        engine.updateGoldAnimated(2, "Early Bird");
                    } else {
                        gameState.gold += 2;
                    }
                    engine?.showMessage?.("Early Bird: +2 Gold!");
                }
                break;
            
            case 'marathon_runner':
                // Track scratches (3 strikes, you're out!) or reaching 42km
                if (!result.isValid) {
                    // Increment scratch count
                    this.marathonScratches = (this.marathonScratches || 0) + 1;
                    
                    if (this.marathonScratches >= 3) {
                        // 3 scratches = destroyed!
                        const marathonIndex = gameState.boons.findIndex(j => j.id === 'marathon_runner');
                        if (marathonIndex !== -1) {
                            gameState.boons.splice(marathonIndex, 1);
                            engine?.showMessage?.("💀 Marathon Runner: 3 scratches! Exhausted and destroyed!", 4000);
                            Logger.info("Marathon Runner destroyed - 3 scratches");
                        }
                    } else {
                        // Show warning
                        engine?.showMessage?.(`⚠️ Marathon Runner: Scratch ${this.marathonScratches}/3!`, 3000);
                        // Reset pips on scratch
                        this.marathonPips = 0;
                    }
                } else if (this.marathonPips >= 42) {
                    // Reached 42km - destroy with fanfare!
                    const marathonIndex = gameState.boons.findIndex(j => j.id === 'marathon_runner');
                    if (marathonIndex !== -1) {
                        gameState.boons.splice(marathonIndex, 1);
                        engine?.showMessage?.("🏅 Marathon Runner: 42km complete! Mission accomplished!", 5000);
                        Logger.info("Marathon Runner destroyed - 42km (marathon) reached");
                    }
                }
                break;
        }
        return result;
    }

    applyTurnStartEffect(gameState, _result, game = null) {
        const engine = game || window.game;
        // Reset dynamic stats at turn start for clean slate
        this.dynamicStats = {
            pips: 0,
            favour: 0,
            gold: 0,
            other: null
        };
        
        // Reset boon trigger counter for Eruption of Etna tracking
        gameState.boonTriggersThisTurn = 0;
        
        switch (this.id) {
            case 'achilles_heel':
                // Achilles Heel: lose 1 Gold at the start of each roll
                if (gameState.gold > 0) {
                    gameState.gold -= 1;
                    engine?.showMessage?.("Achilles' Heel: -1 Gold!");
                }
                break;
            case 'prometheus_gift':
                // Prometheus' Gift: one less re-roll each turn
                gameState.rollsLeft = Math.max(1, gameState.rollsLeft - 1);
                engine?.showMessage?.("Prometheus' Gift: -1 re-roll!");
                break;
            
            case 'chaos_primordial':
                // Chaos Primordial: one less re-roll each turn (in addition to favour doubling)
                gameState.rollsLeft = Math.max(1, gameState.rollsLeft - 1);
                engine?.showMessage?.("Chaos Primordial: -1 re-roll!");
                break;
            
            case 'apollos_oracle':
                // Apollo's Oracle: +1 reroll per turn
                gameState.rollsLeft += 1;
                engine?.showMessage?.("Apollo's Oracle: +1 reroll!");
                break;
            
            // === NEW BOONS - Turn Start ===
            case 'kronos_hourglass':
                // At start of turn, set a random number of rerolls for this turn (1-5)
                const rollsThisTurn = this._randomIntInclusive(1, 5, game);
                gameState.rollsLeft = rollsThisTurn;
                engine?.showMessage?.(`Kronos' Hourglass: ${rollsThisTurn} rerolls this turn!`);
                break;
            
            case 'pandoras_jar': {
                // Every 3rd turn: +2 permanent Favour (stacking) and destroy a random other Boon
                const pandoraInterval = (typeof BOON_EFFECTS !== 'undefined' && BOON_EFFECTS.PANDORAS_JAR?.DESTROY_INTERVAL) || 3;
                const pandoraFavourBonus = 2;
                if (gameState.turn % pandoraInterval === 0 && gameState.boons && gameState.boons.length > 1) {
                    if (!this.pandoraFavourStacks) {
                        this.pandoraFavourStacks = 0;
                    }
                    this.pandoraFavourStacks += pandoraFavourBonus;
                    this.dynamicStats.favour = this.pandoraFavourStacks;
                    engine?.showMessage?.(
                        `Pandora's Jar: +${pandoraFavourBonus} Favour (stacking)! Total +${this.pandoraFavourStacks}.`,
                        3000
                    );

                    const otherBoons = gameState.boons.filter(j => j.id !== 'pandoras_jar');
                    if (otherBoons.length > 0) {
                        const randomIndex = this._randomInt(otherBoons.length, game);
                        const destroyed = otherBoons[randomIndex];
                        const mainIndex = gameState.boons.findIndex(j => j.id === destroyed.id);
                        if (mainIndex !== -1) {
                            gameState.boons.splice(mainIndex, 1);
                            engine?.showMessage?.(`💔 Pandora's Jar: ${destroyed.name} destroyed!`, 3000);
                        }
                    }
                }
                break;
            }
            
            case 'demeters_harvest':
                // Each turn, one random die permanently gains +1 (max 9)
                const harvestDie = gameState.dice[this._randomInt(gameState.dice.length, game)];
                const faceKeys = Object.keys(harvestDie.faces);
                const randomFaceKey = faceKeys[this._randomInt(faceKeys.length, game)];
                const currentValue = harvestDie.faces[randomFaceKey].modifiedValue || harvestDie.faces[randomFaceKey].value;
                
                if (currentValue < 9) {
                    harvestDie.faces[randomFaceKey].modifiedValue = currentValue + 1;
                    engine?.showMessage?.(`Demeter's Harvest: Die face ${randomFaceKey} → ${currentValue + 1}!`);
                }
                break;
            
            case 'the_locksmith':
                // Reset roll tracking at start of each turn
                gameState.dice.forEach(die => {
                    die.rollsHeld = 0;
                });
                break;
            
            case 'the_heretic':
                // Increment heretic stacks each turn
                if (!gameState.hereticStacks) {
                    gameState.hereticStacks = 0;
                }
                gameState.hereticStacks += 2;
                break;
            
            case 'marathon_runner':
                // Reset marathon pips each turn
                this.marathonPips = 0;
                break;
            
            case 'midnight_oil':
                // Turn 12+: lose 1 roll
                if (gameState.turn >= 12) {
                    gameState.rollsLeft = Math.max(1, gameState.rollsLeft - 1);
                    engine?.showMessage?.("Midnight Oil: -1 roll!");
                }
                break;
            
            case 'parmenides_die':
                // Pantheon swap mechanic: scores go to corresponding upper↔lower slot (handled in GameEngine scoring)
                break;
            
            case 'proteus_disguise':
                // Blueprint-style: copies boon to the left (no turn_start action needed)
                break;
            
            case 'reflection_of_narcissus':
                // Reduce rolls by 2
                gameState.rollsLeft = Math.max(1, GAME_BALANCE.STARTING_ROLLS - 2);
                engine?.showMessage?.("Reflection of Narcissus: -2 rolls (boons doubled)!");
                break;
        }
        // No return value needed for turn_start effects
    }

    applyTurnEndEffect(gameState, result, game = null) {
        const engine = game || window.game;
        switch (this.id) {
            case 'icarus_wings':
                // Chance to break after turn 1 in 8
                if (gameState.turn > 1 && this._getPrng(game)?.random() < 1/8) {
                    // Break the boon (remove it)
                    const boonIndex = gameState.boons.findIndex(j => j.id === this.id);
                    if (boonIndex !== -1) {
                        gameState.boons.splice(boonIndex, 1);
                        engine?.showMessage?.("Icarus' Wings: The wings broke!");
                    }
                }
                break;
        }
        return result;
    }

    applyShopEnterEffect(gameState, result, _game = null) {
        // Effects that trigger when entering the shop
        return result;
    }

    applyShopExitEffect(gameState, result, _game = null) {
        // Effects that trigger when leaving the shop
        return result;
    }

    applyHandEffect(gameState, result, _game = null) {
        // Effects that modify the current hand
        return result;
    }

    applySellEffect(gameState, result, game = null) {
        const engine = game || window.game;
        // Effects that trigger when selling cards
        switch (this.id) {
            case 'the_merchant':
                // Selling libation and worship cards gives +1 extra gold
                if (result.cardType === 'worship' || result.cardType === 'libation') {
                    const bonusGold = 1;
                    gameState.gold += bonusGold;
                    engine?.showMessage?.("The Merchant: +1 bonus Gold from sale!", 2500);
                    Logger.info(`The Merchant: +1 bonus gold from selling ${result.cardType}`);
                }
                break;
            
            case 'mortal_vineyard':
                // Selling a Boon gives you a random Libation
                if (result.cardType === 'boon' && window.CardData && window.CardData.libations) {
                    const randomLibation = window.CardData.libations[this._randomInt(window.CardData.libations.length, game)];
                    
                    // Add libation to consumables
                    if (gameState.consumables && randomLibation) {
                        const newLibation = new LibationCard(randomLibation);
                        gameState.consumables.push(newLibation);
                        engine?.showMessage?.(`🍷 Mortal Vineyard: Gained ${randomLibation.name}!`, 3500);
                        Logger.info(`Mortal Vineyard: Converted boon sale into ${randomLibation.name}`);
                    }
                }
                break;
        }
        // No return value needed for sell effects
    }

    applyAnteEndEffect(gameState, _result, game = null) {
        const engine = game || window.game;
        // Effects that trigger at the end of an Ante
        switch (this.id) {
            case 'the_heretic':
                // Reset stacks at ante end (with other ante_end boon effects)
                if (gameState.hereticStacks && gameState.hereticStacks > 0) {
                    gameState.hereticStacks = 0;
                    this.dynamicStats = { ...this.dynamicStats, pips: 0, other: 'Reset' };
                }
                break;
            case 'cornucopia_of_ploutos':
                // At end of Ante, multiply gold by 1.5 (rounded down)
                const originalGold = gameState.gold;
                const cornucopiaNew = Math.floor(gameState.gold * 1.5);
                const cornucopiaDelta = cornucopiaNew - originalGold;
                if (cornucopiaDelta > 0 && engine?.updateGoldAnimated) {
                    engine.updateGoldAnimated(cornucopiaDelta, "Cornucopia");
                } else if (cornucopiaDelta !== 0) {
                    gameState.gold = cornucopiaNew;
                }
                if (cornucopiaDelta > 0) {
                    engine?.showMessage?.(`🌽 Cornucopia of Ploutos: Gold ${originalGold} → ${cornucopiaNew}!`, 4000);
                    Logger.info(`Cornucopia: Gold multiplied from ${originalGold} to ${cornucopiaNew}`);
                }
                break;
            
            case 'the_odyssey':
                // If ALL categories filled with NO scratches, gain (total categories)² pips to final score
                const allCategories = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
                                      'Three of a Kind', 'Four of a Kind', 'Full House',
                                      'Small Straight', 'Large Straight', 'Yahtzee', 'Chance'];
                
                // Add unlocked categories
                const availableCategories = [...allCategories];
                if (gameState.unlockedCategories?.Sevens) availableCategories.push('Sevens');
                if (gameState.unlockedCategories?.Eights) availableCategories.push('Eights');
                if (gameState.unlockedCategories?.Nines) availableCategories.push('Nines');
                
                // Check if ALL filled and NO scratches (score = 0)
                const allFilled = availableCategories.every(cat => gameState.scorecard[cat] !== undefined);
                const noScratches = availableCategories.every(cat => 
                    gameState.scorecard[cat] === undefined || gameState.scorecard[cat] > 0
                );
                
                if (allFilled && noScratches) {
                    const odysseyBonus = availableCategories.length * availableCategories.length;
                    gameState.totalScore += odysseyBonus;
                    engine?.showMessage?.(`⛵ The Odyssey: Perfect journey! +${odysseyBonus} points (${availableCategories.length}²)!`, 5000);
                    Logger.info(`The Odyssey: Perfect completion bonus ${odysseyBonus} points`);
                } else if (allFilled) {
                    engine?.showMessage?.("⛵ The Odyssey: Journey complete, but with scratches (no bonus)", 3000);
                }
                break;
            
            case 'message_in_a_bottle':
                // If completed ante with no other boons entire ante, gain +50% of score threshold
                const hadOnlyBottle = !gameState.hadOtherBoonsThisAnte;
                
                if (hadOnlyBottle) {
                    const threshold = gameState.scoreThreshold || 200;
                    const bonus = Math.floor(threshold * 0.5);
                    gameState.totalScore += bonus;
                    engine?.showMessage?.(`📜 Message in a Bottle: Solo journey! +${bonus} points (50% of threshold)!`, 5000);
                    Logger.info(`Message in a Bottle: Solo bonus ${bonus} points`);
                } else {
                    engine?.showMessage?.("📜 Message in a Bottle: You had company this trial (no bonus)", 2000);
                }
                
                // Reset tracking for next ante
                gameState.hadOtherBoonsThisAnte = false;
                break;
            
            case 'betrayal_by_paris':
                // Destroy a random Boon at end of Ante, gain +10 Gold
                if (gameState.boons && gameState.boons.length > 1) {
                    // Don't destroy Betrayal by Paris itself
                    const otherBoons = gameState.boons.filter(j => j.id !== 'betrayal_by_paris');
                    
                    if (otherBoons.length > 0) {
                        const randomIndex = this._randomInt(otherBoons.length, game);
                        const destroyed = otherBoons[randomIndex];
                        
                        // Remove from main array
                        const mainIndex = gameState.boons.findIndex(j => j.id === destroyed.id);
                        if (mainIndex !== -1) {
                            gameState.boons.splice(mainIndex, 1);
                            if (engine?.updateGoldAnimated) engine.updateGoldAnimated(10, "Betrayal by Paris");
                            else gameState.gold += 10;
                            engine?.showMessage?.(`💔 Betrayal by Paris: ${destroyed.name} destroyed! +10 Gold`, 4000);
                            Logger.info(`Betrayal by Paris destroyed ${destroyed.name}, gained 10 gold`);
                        }
                    } else {
                        if (engine?.updateGoldAnimated) engine.updateGoldAnimated(10, "Betrayal by Paris");
                        else gameState.gold += 10;
                        engine?.showMessage?.("Betrayal by Paris: No one left to betray! +10 Gold", 3000);
                    }
                } else {
                    if (engine?.updateGoldAnimated) engine.updateGoldAnimated(10, "Betrayal by Paris");
                    else gameState.gold += 10;
                    engine?.showMessage?.("Betrayal by Paris: No one left to betray! +10 Gold", 3000);
                }
                break;
        }
        // No return value needed for ante_end effects
    }

    // Helper method to check for three of the same face
    hasThreeOfSameFace(dice) {
        const counts = {};
        dice.forEach(die => {
            counts[die.face] = (counts[die.face] || 0) + 1;
        });
        return Object.values(counts).some(count => count >= 3);
    }

    // Helper method to check for exactly three of a kind
    hasExactlyThreeOfAKind(dice) {
        const counts = {};
        dice.forEach(die => {
            counts[die.face] = (counts[die.face] || 0) + 1;
        });
        return Object.values(counts).some(count => count === 3);
    }

    // Helper method to count pairs
    countPairs(dice) {
        const counts = {};
        dice.forEach(die => {
            counts[die.face] = (counts[die.face] || 0) + 1;
        });
        return Object.values(counts).filter(count => count === 2).length;
    }

    // Calculate value added by this boon
    calculateValueAdded(original, modified) {
        // Handle null/undefined cases (e.g., turn_start events)
        if (!original || !modified) {
            return 0;
        }
        
        // Ensure both objects have the required properties
        const originalPips = original.pips || 0;
        const originalFavour = original.favour || 0;
        const modifiedPips = modified.pips || 0;
        const modifiedFavour = modified.favour || 0;
        
        const originalTotal = originalPips * originalFavour;
        const modifiedTotal = modifiedPips * modifiedFavour;
        return modifiedTotal - originalTotal;
    }

    // Get ongoing effects this boon provides
    getOngoingEffects() {
        const effects = [];
        
        switch (this.id) {
            case 'hermes_sandals':
                effects.push({ type: 'extra_roll', value: 1 });
                break;
            case 'cerberus_collar':
                effects.push({ type: 'base_favour', value: 1 });
                effects.push({ type: 'rolls_penalty', value: -1 });
                break;
            case 'cornucopia':
                effects.push({ type: 'interest_cap', value: 1 });
                break;
            case 'titans_grip':
                effects.push({ type: 'max_held', value: 2 });
                break;
            default:
                // No ongoing effects
                break;
        }
        
        return effects;
    }

    // Check if this boon affects dice rolling
    affectsDiceRoll() {
        return ['aegis_shield', 'fate_spinner', 'probability_god'].includes(this.id);
    }

    // Apply dice roll effects (prng param kept for API compatibility; uses _getPrng() internally)
    applyDiceRollEffect(dice, gameState, prng) {
        const rng = this._getPrng() || prng;
        if (!rng) return;

        switch (this.id) {
            case 'aegis_shield':
                // Duplicate first held die
                const firstHeld = gameState.held.findIndex(h => h);
                if (firstHeld !== -1 && gameState.held.filter(h => h).length === 1) {
                    const heldDie = dice[firstHeld];
                    dice.forEach((die, index) => {
                        if (!gameState.held[index] && die.face === 0) {
                            die.face = heldDie.face;
                            return; // Exit the forEach early
                        }
                    });
                }
                break;
                
            case 'probability_god':
                dice.forEach(die => {
                    if (rng.random() < 0.5) {
                        while (die.face !== 6 && rng.random() < 0.8) {
                            die.roll(rng);
                        }
                    }
                });
                break;
                
            default:
                // No dice roll effects
                break;
        }
    }

    // Get description with current state
    getDetailedDescription() {
        let desc = this.effect;
        
        if (this.timesTriggered > 0) {
            desc += ` (Triggered ${this.timesTriggered} times, +${this.totalValue} value)`;
        }
        
        if (!this.isActive) {
            desc += ' [DISABLED]';
        }
        
        return desc;
    }

    // Check synergy with other boons
    synergizesWith(otherCard) {
        if (!(otherCard instanceof Boon)) return false;
        
        // God-based synergies
        if (this.god && otherCard.god && this.god === otherCard.god) {
            return true;
        }
        
        // Effect-based synergies
        const synergies = {
            'high_roller': ['lions_mane'], // Both benefit from 6s
            'warrior_rage': ['god_killer'], // Both boost of-a-kind hands
            'golden_fleece': ['chaos_primordial'], // High pip synergy
        };
        
        return synergies[this.id]?.includes(otherCard.id) || 
               synergies[otherCard.id]?.includes(this.id);
    }

    // Get the current favour value this boon provides (for display on card)
    getCurrentFavourValue(gameState) {
        if (!gameState) return 0;
        
        switch (this.id) {
            case 'mt_olympus':
                // +1 favour per worship used
                const worshipCount = Object.values(gameState.worshipLevels || {}).reduce((sum, level) => sum + level, 0);
                return worshipCount;
                
            case 'prometheus_gift':
                // +3 favour to all hands
                return 3;
                
            case 'forge_of_hephaestus':
                // +0.5 favour per unused reroll (max 1.5)
                const unusedRerolls = gameState.rollsLeft || 0;
                return Math.min(Math.max(0, unusedRerolls) * 0.5, 1.5);
                
            case 'hestias_hearth':
                // +3 favour if all dice are odd or even
                if (gameState.dice && gameState.dice.length > 0) {
                    const allFaces = gameState.dice.map(d => d.getEffectiveFace());
                    const allOdd = allFaces.every(face => face % 2 === 1);
                    const allEven = allFaces.every(face => face % 2 === 0);
                    return (allOdd || allEven) ? 3 : 0;
                }
                return 0;
                
            default:
                return 0;
        }
    }

    /**
     * Balatro-style dynamic stat display - Returns array of stats to show on card
     * @param {Object} gameState - Current game state
     * @returns {Array<{value: string, type: string}>} Array of stats to display
     * @example
     * // Returns: [{ value: "+20 Pips", type: "pips" }, { value: "x3", type: "favour" }]
     */
    getDynamicDisplayStats(gameState) {
        if (!gameState) return [];
        
        const stats = [];
        
        // Check dynamic stats tracking (the_heretic uses live gameState in its own case)
        if (this.id !== 'the_heretic' && this.dynamicStats.pips > 0) {
            stats.push({ value: `+${this.dynamicStats.pips}`, type: 'pips' });
        }
        
        if (this.id !== 'mt_olympus' && this.dynamicStats.favour > 0) {
            const f = this.dynamicStats.favour;
            stats.push({ value: (window.NumberFormat ? window.NumberFormat.favour(f) : `×${f}`), type: 'favour' });
        } else if (this.id !== 'mt_olympus') {
            const favour = this.getCurrentFavourValue(gameState);
            if (favour > 0) {
                stats.push({ value: (window.NumberFormat ? window.NumberFormat.favour(favour) : `×${favour}`), type: 'favour' });
            }
        }
        
        if (this.dynamicStats.gold > 0) {
            stats.push({ value: `+${this.dynamicStats.gold}g`, type: 'gold' });
        }
        
        if (this.dynamicStats.other) {
            stats.push({ value: this.dynamicStats.other, type: 'other' });
        }
        
        // Boon-specific dynamic displays (examples from your creative ideas)
        switch (this.id) {
            case 'mt_olympus':
                // Live counter: current favour bonus from worship cards used this run
                const worshipUsed = Object.values(gameState.worshipLevels || {}).reduce((sum, level) => sum + level, 0);
                if (worshipUsed > 0) {
                    stats.push({ value: `+${worshipUsed} worship`, type: 'favour' });
                }
                break;
            case 'experience_points':
                // Example: "Experience Points" boon that gains pips per 100 score
                const totalScore = Object.values(gameState.scorecard || {})
                    .filter(v => typeof v === 'number')
                    .reduce((sum, v) => sum + v, 0);
                const gainedPips = Math.floor(totalScore / 100) * 10;
                if (gainedPips > 0) {
                    stats.push({ value: `+${gainedPips}`, type: 'pips' });
                }
                break;
                
            case 'lucky_sevens':
                // Example: Shows count of 7s rolled this game
                const sevenCount = this.timesTriggered || 0;
                if (sevenCount > 0) {
                    stats.push({ value: `${sevenCount} 7s`, type: 'other' });
                }
                break;
                
            case 'interest_accumulator':
                // Example: Shows gold earned from interest
                const goldEarned = this.dynamicStats.gold || 0;
                if (goldEarned > 0) {
                    stats.push({ value: `+${goldEarned}g`, type: 'gold' });
                }
                break;
                
            case 'charge_based_boon':
                // Example: Shows charges (e.g., "3/5")
                if (this.maxUses > 0) {
                    stats.push({ value: `${this.usesLeft}/${this.maxUses}`, type: 'other' });
                }
                break;
                
            case 'golden_touch':
                // Interest rate: 1 per 3g (vs 1 per 5g base)
                stats.push({ value: '1 per 3g', type: 'other' });
                break;
            case 'the_heretic':
                // Live pip counter: current stacks (resets at ante end or when worship used)
                const hereticStacks = gameState.hereticStacks || 0;
                if (hereticStacks > 0) {
                    stats.push({ value: `+${hereticStacks}`, type: 'pips' });
                    stats.push({ value: '🚫 No Worship', type: 'other' });
                } else {
                    stats.push({ value: 'Reset', type: 'other' });
                }
                break;
            case 'proteus_disguise':
                // Blueprint-style: show boon to the left
                const boons = gameState.boons || [];
                const idx = boons.findIndex(j => j === this);
                const leftBoon = idx > 0 ? boons[idx - 1] : null;
                if (leftBoon) {
                    stats.push({ value: `→${leftBoon.name}`, type: 'other' });
                } else {
                    stats.push({ value: 'No target', type: 'other' });
                }
                break;
        }
        
        return stats;
    }

    // Static method to create boon from game data
    static fromData(data) {
        return new Boon(data);
    }
}