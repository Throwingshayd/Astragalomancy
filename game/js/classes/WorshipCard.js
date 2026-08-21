/* exported WorshipCard */
// WorshipCard class - Represents worship cards that increase god favor

class WorshipCard extends Card {
    constructor(data) {
        super(data);
        this.type = 'worship';
        this.god = data.god;
        this.worshipType = data.worshipType || 'level'; // 'level', 'bonus', 'special'
        this.worshipValue = data.worshipValue || 1;
        this.category = this.getCategory(); // Which scorecard category this affects
        this.heldTrials = data.heldTrials || 0;
        this.devotionAscended = !!data.devotionAscended;
    }

    render(isShopItem = false, isDirectSale = false) {
        const el = super.render(isShopItem, isDirectSale);
        if (this.devotionAscended) {
            el.classList.add('devotion-ascended');
        } else if (this.heldTrials > 0) {
            el.classList.add('devotion-holding');
            const roman = typeof DevotionUtils !== 'undefined'
                ? DevotionUtils.heldTrialsRoman(this.heldTrials)
                : String(this.heldTrials);
            el.dataset.heldTrials = roman;
        }
        return el;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            heldTrials: this.heldTrials || 0,
            devotionAscended: !!this.devotionAscended,
        };
    }

    // Get the scorecard category this worship affects (from GOD_METADATA)
    getCategory() {
        return typeof GodUtils !== 'undefined' ? GodUtils.getCategory(this.god) : null;
    }

    // Apply the worship effect
    applyWorship(gameState) {
        if (typeof BlindDirector !== 'undefined' && BlindDirector.blocksWorship(gameState)) return false;
        if (!this.canUse()) return false;

        switch (this.worshipType) {
            case 'level':
                this.levelUpWorship(gameState);
                break;
            case 'bonus':
                this.applyBonusEffect(gameState);
                break;
            case 'special':
                this.applySpecialEffect(gameState);
                break;
        }

        // Reset The Heretic stacks when worship is used
        if (gameState.hereticStacks && gameState.hereticStacks > 0) {
            const heretic = gameState.boons?.find(j => j.id === 'the_heretic');
            if (heretic) {
                gameState.hereticStacks = 0;
                heretic.dynamicStats = { ...heretic.dynamicStats, pips: 0, other: 'Reset' };
                window.game?.showMessage?.("The Heretic: Stacks reset by worship!");
            }
        }
        
        // Track last worship god for The Zealot boon
        gameState.lastWorshipGod = this.god;
        
        // Cycle of Seasons: spread worship to another god
        const hasCycle = gameState.boons?.some(j => j.id === 'cycle_of_seasons');
        if (hasCycle) {
            // Build list of available gods (excluding current and locked categories)
            const baseGods = ['Artemis', 'Aphrodite', 'Morpheus', 'Hera', 'Athena', 
                             'Heracles', 'Hephaestus', 'Ares', 'Dionysus', 'Hermes', 
                             'Apollo', 'Zeus', 'Nyx'];
            
            // Add 7/8/9 gods only if unlocked
            const availableGods = [...baseGods];
            if (gameState.unlockedCategories?.Sevens) availableGods.push('The Pleiades');
            if (gameState.unlockedCategories?.Eights) availableGods.push('Poseidon');
            if (gameState.unlockedCategories?.Nines) availableGods.push('The Nine Muses');
            if (gameState.unlockedCategories?.["Pandora's Box"]) availableGods.push("Pandora's Box");
            
            // Pick different god - use seeded RNG
            const otherGods = availableGods.filter(g => g !== this.god);
            const engine = window.game;
            const randomGod = otherGods[Math.floor(engine.prng.random() * otherGods.length)];
            
            gameState.worshipLevels[randomGod] = (gameState.worshipLevels[randomGod] || 0) + 1;
            window.game?.showMessage?.(`🌸 Cycle of Seasons: ${randomGod} also gains +1 worship!`, 3000);
        }

        this.use();
        return true;
    }

    // Standard level up worship
    levelUpWorship(gameState) {
        gameState.worshipLevels[this.god] = (gameState.worshipLevels[this.god] || 0) + this.worshipValue;
        
        // Apply any additional effects based on specific cards
        this.applyCardSpecificEffects(gameState);
        
        window.game?.showMessage?.(`${this.god} worship increased to level ${gameState.worshipLevels[this.god]}!`);
    }

    // Apply bonus effects (temporary boosts)
    applyBonusEffect(gameState) {
        switch (this.id) {
            case 'artemis_2': // Huntress' Mark
                // First die each turn locks to 1
                gameState.diceEffects = gameState.diceEffects || {};
                gameState.diceEffects.firstDieLockTo1 = true;
                break;
                
            case 'aphrodite_2': // Twos pip blessing
                // Twos give +2 Pips each
                gameState.pipsBonuses = gameState.pipsBonuses || {};
                gameState.pipsBonuses.twosBonus = 2;
                break;
                
            case 'morpheus_2': // Dream Walker
                // Can reroll 3s once per turn
                gameState.rerollAbilities = gameState.rerollAbilities || {};
                gameState.rerollAbilities.rerollThrees = true;
                break;
                
            case 'hera_2': // Queen's Authority
                // Fours count as 5s for scoring
                gameState.diceSubstitutions = gameState.diceSubstitutions || {};
                gameState.diceSubstitutions.foursAsFives = true;
                break;
                
            case 'athena_2': // Strategic Mind
                // See next roll before deciding holds
                gameState.abilities = gameState.abilities || {};
                gameState.abilities.seeNextRoll = true;
                break;
                
            case 'heracles_2': // Hero's Courage
                // Sixes give +10 Pips each
                gameState.pipsBonuses = gameState.pipsBonuses || {};
                gameState.pipsBonuses.sixesBonus = 10;
                break;
        }
    }

    // Apply special powerful effects
    applySpecialEffect(gameState) {
        switch (this.id) {
            case 'artemis_3': // Moon's Grace
                // Ones category can be scored twice
                gameState.doubleScoringAllowed = gameState.doubleScoringAllowed || [];
                gameState.doubleScoringAllowed.push('Ones');
                break;
                
            case 'aphrodite_3': // Gold per 2 rolled
                // Gain +1 Gold per 2 rolled
                gameState.goldPerDie = gameState.goldPerDie || {};
                gameState.goldPerDie[2] = 1;
                break;
                
            case 'morpheus_3': // Master of Sleep
                // All dice become 3s before first roll
                gameState.forcedDiceValues = gameState.forcedDiceValues || {};
                gameState.forcedDiceValues.allThrees = true;
                break;
                
            case 'hera_3': // Queen's Wrath
                // Reroll all dice when you roll 4 Fours
                gameState.triggerEffects = gameState.triggerEffects || {};
                gameState.triggerEffects.fourFoursReroll = true;
                break;
                
            case 'athena_3': // Goddess of War
                // Fives add their value to ALL other scores
                gameState.globalBonuses = gameState.globalBonuses || {};
                gameState.globalBonuses.fivesToAll = true;
                break;
                
            case 'heracles_3': // Twelve Labors
                // Win immediately with 12 total Sixes scored
                gameState.winConditions = gameState.winConditions || {};
                gameState.winConditions.twelveSixes = true;
                break;
                
            case 'zeus_3': // Lord of Olympus
                // Each Yahtzee permanently increases Base Favour by 1
                gameState.yahtzeeEffects = gameState.yahtzeeEffects || {};
                gameState.yahtzeeEffects.increaseFavour = true;
                break;
                
            case 'apollo_3': // God of Prophecy
                // Know all dice results for rest of ante after Large Straight
                gameState.prophecyEffects = gameState.prophecyEffects || {};
                gameState.prophecyEffects.seeAllAfterStraight = true;
                break;
                
            case 'nyx_3': // Primordial Darkness
                // Chance can be scored in any category once per ante
                gameState.flexibleScoring = gameState.flexibleScoring || {};
                gameState.flexibleScoring.chanceAnywhere = true;
                break;
        }
    }

    // Apply card-specific effects during level up
    applyCardSpecificEffects(_gameState) {
    }

    // Held devotion: 3 trials → Ascended (no gold while held).
    static tickHeldDevotionTrials(gameState, gameEngine) {
        if (!gameState?.consumables?.length) return;
        const need = typeof DEVOTION_TRIALS_TO_ASCEND !== 'undefined' ? DEVOTION_TRIALS_TO_ASCEND : 3;
        for (const c of gameState.consumables) {
            if (!(c instanceof WorshipCard) || !c.canUse() || c.devotionAscended) continue;
            c.heldTrials = (c.heldTrials || 0) + 1;
            if (c.heldTrials >= need) {
                c.devotionAscended = true;
                gameEngine?.showMessage?.(
                    `${c.name} ascended — consecrate any pantheon row (${c.category} devotion).`,
                    4000
                );
            }
        }
    }

    applyAscendedConsecration(gameState, targetCategory) {
        if (typeof BlindDirector !== 'undefined' && BlindDirector.blocksWorship(gameState)) return false;
        if (!this.devotionAscended || !targetCategory || !this.god) return false;
        if (['Sevens', 'Eights', 'Nines'].includes(targetCategory)
            && !gameState.unlockedCategories?.[targetCategory]) {
            return false;
        }
        const sourceCategory = this.getCategory();
        if (!sourceCategory) return false;
        if (typeof DevotionUtils !== 'undefined') {
            DevotionUtils.applyConsecration(gameState, targetCategory, this.god, sourceCategory);
        }
        this.use();
        return true;
    }

    _pipsPerLevelForCategory() {
        const cat = this.category;
        if (!cat) return 0;
        return (typeof CATEGORY_PIPS_PER_LEVEL !== 'undefined' && CATEGORY_PIPS_PER_LEVEL[cat]) || 0;
    }

    // Get the current worship level for this god
    getCurrentWorshipLevel(gameState) {
        return gameState.worshipLevels[this.god] || 0;
    }

    // Calculate the effective favour bonus this provides
    getFavourBonus(gameState) {
        return this.getCurrentWorshipLevel(gameState);
    }

    // Check if this worship card has special ongoing effects
    hasOngoingEffects() {
        const ongoingEffects = [
            'artemis_2', 'aphrodite_2', 'morpheus_2', 'hera_2',
            'athena_2', 'heracles_2', 'artemis_3', 'aphrodite_3',
            'morpheus_3', 'hera_3', 'athena_3', 'heracles_3',
            'zeus_3', 'apollo_3', 'nyx_3'
        ];
        return ongoingEffects.includes(this.id);
    }

    // Get description of ongoing effects
    getOngoingEffectDescription() {
        const descriptions = {
            'artemis_2': 'First die each turn automatically becomes 1',
            'aphrodite_2': 'Each 2 provides +2 extra pips when scoring',
            'morpheus_2': 'Can reroll any 3s once per turn for free',
            'hera_2': 'All 4s count as 5s for scoring purposes',
            'athena_2': 'Can preview next dice roll before choosing holds',
            'heracles_2': 'Each 6 provides +10 extra pips when scoring',
            'artemis_3': 'Ones category can be scored multiple times',
            'aphrodite_3': 'Gain 1 gold for each 2 rolled this turn',
            'morpheus_3': 'All dice start as 3s each turn',
            'hera_3': 'Rolling four 4s triggers a free reroll',
            'athena_3': 'Fives add their value to every score',
            'heracles_3': 'Win instantly upon scoring 12 total sixes',
            'zeus_3': 'Each Yahtzee permanently increases base favour',
            'apollo_3': 'Large Straight reveals all future dice rolls',
            'nyx_3': 'Chance hand can substitute for any category once per trial'
        };
        return descriptions[this.id] || '';
    }

    // Get the god's domain/theme
    getGodDomain() {
        const domains = {
            'Artemis': 'Hunt & Moon',
            'Aphrodite': 'Love & Beauty',
            'Morpheus': 'Dreams & Sleep',
            'Poseidon': 'Sea & Earthquakes',
            'Athena': 'Wisdom & War',
            'Heracles': 'Strength & Heroes',
            'Hephaestus': 'Power & Might',
            'Ares': 'War & Courage',
            'Dionysus': 'Wine & Ecstasy',
            'Hermes': 'Speed & Messages',
            'Apollo': 'Sun & Prophecy',
            'Zeus': 'Sky & Thunder',
            'Nyx': 'Night & Chaos'
        };
        return domains[this.god] || 'Unknown';
    }

    // Check if this worship synergizes with others
    synergizesWith(otherCard) {
        if (otherCard instanceof WorshipCard) {
            // Same god synergy
            if (this.god === otherCard.god) return true;
            
            // Complementary god synergies
            const synergies = {
                'Artemis': ['Aphrodite'], // 1s and 2s
                'Morpheus': ['Hera'],      // 3s and 4s
                'Athena': ['Heracles'],    // 5s and 6s
                'Hephaestus': ['Ares'],    // 3 and 4 of a kind
                'Hermes': ['Apollo'],      // Small and large straights
                'Zeus': ['Nyx']            // Yahtzee and Chance
            };
            
            return synergies[this.god]?.includes(otherCard.god) ||
                   synergies[otherCard.god]?.includes(this.god);
        }
        
        // Synergy with boons of same god
        if (otherCard instanceof Boon && otherCard.god === this.god) {
            return true;
        }
        
        return false;
    }

    // Static method to create worship card from data
    static fromData(data) {
        return new WorshipCard(data);
    }

    // Get worship progress visualization
    getWorshipProgress(gameState) {
        const currentLevel = this.getCurrentWorshipLevel(gameState);
        const maxLevel = 10; // Arbitrary max for display
        const percentage = Math.min(100, (currentLevel / maxLevel) * 100);
        
        return {
            level: currentLevel,
            maxLevel: maxLevel,
            percentage: percentage,
            nextLevelBenefit: this.getNextLevelBenefit(currentLevel)
        };
    }

    // Get what the next worship level would provide
    getNextLevelBenefit(currentLevel) {
        const nextLevel = currentLevel + 1;
        const perLevel = typeof WORSHIP_FAVOUR_PER_LEVEL !== 'undefined' ? WORSHIP_FAVOUR_PER_LEVEL : 0.25;
        const pip = this._pipsPerLevelForCategory();
        const favStr = typeof NumberFormat !== 'undefined' ? NumberFormat.favourContrib(perLevel) : String(perLevel);
        return `Level ${nextLevel}: +${pip} pips & +${favStr} Favour when scoring ${this.category}`;
    }
}