/* exported WorshipCard */
// WorshipCard class - Represents worship cards that increase god favor

class WorshipCard extends Card {
    constructor(data) {
        super(data);
        this.type = 'worship';
        this.god = data.god;
        this.worshipType = data.worshipType || 'level';
        this.worshipValue = data.worshipValue || 1;
        this.category = this.getCategory(); // Which scorecard category this affects
        this.heldTrials = data.heldTrials || 0;
        this.devotionAscended = !!data.devotionAscended;
    }

    render(isShopItem = false, isDirectSale = false, gameState = null) {
        const el = super.render(isShopItem, isDirectSale, gameState);
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
    applyWorship(gameState, game = null) {
        if (typeof BlindDirector !== 'undefined' && BlindDirector.blocksWorship(gameState)) return false;
        if (!this.canUse()) return false;

        this.levelUpWorship(gameState, game);

        // Reset The Heretic stacks when worship is used
        if (gameState.hereticStacks && gameState.hereticStacks > 0) {
            const heretic = gameState.boons?.find(j => j.id === 'the_heretic');
            if (heretic) {
                gameState.hereticStacks = 0;
                heretic.dynamicStats = { ...heretic.dynamicStats, pips: 0, other: 'Reset' };
                game?.showMessage?.("The Heretic: Stacks reset by worship!");
            }
        }
        
        // Track last worship god for The Zealot boon
        gameState.lastWorshipGod = this.god;
        
        // Cycle of Seasons: spread worship to another god
        const hasCycle = gameState.boons?.some(j => j.id === 'cycle_of_seasons');
        if (hasCycle && game?.prng) {
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
            const randomGod = otherGods[Math.floor(game.prng.random() * otherGods.length)];
            
            gameState.worshipLevels[randomGod] = (gameState.worshipLevels[randomGod] || 0) + 1;
            game.showMessage?.(`🌸 Cycle of Seasons: ${randomGod} also gains +1 worship!`, 3000);
        }

        this.use();
        return true;
    }

    levelUpWorship(gameState, game = null) {
        gameState.worshipLevels[this.god] = (gameState.worshipLevels[this.god] || 0) + this.worshipValue;
        game?.showMessage?.(`${this.god} worship increased to level ${gameState.worshipLevels[this.god]}!`);
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
        const gated = typeof UNLOCKABLE_SCORE_ROWS !== 'undefined'
            ? UNLOCKABLE_SCORE_ROWS
            : ['Sevens', 'Eights', 'Nines', 'Heureka', 'Extra Long Straight'];
        if (gated.includes(targetCategory) && !gameState.unlockedCategories?.[targetCategory]) {
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
}