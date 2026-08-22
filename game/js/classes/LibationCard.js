// LibationCard class - Represents libation cards that modify game mechanics

class LibationCard extends Card {
    constructor(data) {
        super(data);
        this.type = 'libation';
        this.ruleType = data.ruleType || 'libation';
        this.effectType = data.effectType || 'instant';
        this.maxUses = data.maxUses || 1;
        this.usesLeft = data.usesLeft || this.maxUses;
        this.timing = data.timing || 'anytime';
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

    applyRule(gameState, gameEngine = null) {
        if (!this.canUse()) return false;
        const consumed = this.applyLibationEffect(gameState, gameEngine);
        if (consumed) {
            this.use(gameState);
            return true;
        }
        return false; // Die-targeting: consume when user selects a die
    }

    /**
     * @returns {boolean} true if effect consumed immediately; false if awaiting die selection
     */
    applyLibationEffect(gameState, gameEngine = null) {
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
                gameEngine?.showMessage?.(`Kylix of the Hermit: +${gain} gold (double, max gain 20)!`);
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
                    gameEngine?.showMessage?.("The Eucharist: No gods available to worship!");
                }
                return false;
            }
            case 'divine_guidance': {
                const availableGods = Object.keys(gameState.worshipLevels || {});
                if (availableGods.length >= 2) {
                    if (!gameEngine?.prng) return false;
                    const shuffledGods = [...availableGods].sort(() => gameEngine.prng.random() - 0.5);
                    const god1 = shuffledGods[0];
                    const god2 = shuffledGods[1];
                    gameState.worshipLevels[god1] = (gameState.worshipLevels[god1] || 0) + 1;
                    gameState.worshipLevels[god2] = (gameState.worshipLevels[god2] || 0) + 1;
                    gameEngine.showMessage?.(`Divine Guidance: ${god1} and ${god2} worship increased by 1 each!`);
                } else if (availableGods.length === 1) {
                    const god = availableGods[0];
                    gameState.worshipLevels[god] = (gameState.worshipLevels[god] || 0) + 2;
                    gameEngine?.showMessage?.(`Divine Guidance: ${god} worship increased by 2!`);
                } else {
                    gameEngine?.showMessage?.("Divine Guidance: No gods available to worship!");
                }
                return true;
            }
            default:
                return false;
        }
    }

    promptForDieFaceSelection(gameState, enhancementType, gameEngine = null) {
        if (!gameState.hasRolled) {
            gameEngine?.showMessage?.('Roll the dice first, then click a die to enhance.');
            return;
        }
        const enhancementNames = {
            parchment: 'Parchment',
            iron: 'Clockwork',
            gold: 'Gold',
            mother_of_pearl: 'Mother of Pearl',
            mirror: 'Mirror',
            wild: 'Wild',
            permanent_reduce: 'Permanently Reduce by 1',
            permanent_increase: 'Permanently Increase by 1',
        };
        const enhancementName = enhancementNames[enhancementType];
        gameEngine?.showMessage?.(`${this.name}: Click a die on the table to apply ${enhancementName}!`);
        this.enterLibationTargetingMode(gameState, enhancementType, gameEngine);
    }

    enterLibationTargetingMode(gameState, enhancementType, gameEngine = null) {
        if (!gameEngine) return;
        gameEngine.state.libationTargetingMode = { libation: this, enhancementType };
        gameEngine.updateAllUI?.();
    }

    applyEnhancementToDie(gameState, dieIndex, enhancementType, targetFaceValue, gameEngine = null) {
        const die = gameState.dice[dieIndex];
        if (!die) {
            gameEngine?.showMessage?.('Invalid die selected!');
            Logger.error('Invalid die index', { dieIndex });
            return;
        }

        if (typeof die.isValidFace !== 'function') {
            Logger.error('Die object missing validation methods');
            gameEngine?.showMessage?.('Die validation error!');
            return;
        }

        let message = '';
        const dieNumber = dieIndex + 1;
        const requestedFace = parseInt(targetFaceValue, 10);
        const isFaceRewriter = enhancementType === 'permanent_reduce' || enhancementType === 'permanent_increase';
        const targetFace = isFaceRewriter ? die.currentFace : requestedFace;

        if (!die.isValidFace(targetFace)) {
            const errorMsg = `Invalid face value: ${targetFaceValue}. Must be 1-9.`;
            gameEngine?.showMessage?.(errorMsg);
            Logger.warn('Invalid face value', { targetFaceValue });
            return;
        }

        switch (enhancementType) {
            case 'parchment':
                message = die.addFaceEnhancement(targetFace, 'parchment')
                    ? `Die ${dieNumber} face ${targetFace} enhanced with Parchment (25% +1 Favour, 15% +5 Gold).`
                    : 'Failed to apply parchment enhancement!';
                break;
            case 'iron':
                message = die.addFaceEnhancement(targetFace, 'iron')
                    ? `Die ${dieNumber} face ${targetFace} enhanced with Clockwork (+5 Pips when scored).`
                    : 'Failed to apply iron enhancement!';
                break;
            case 'gold':
                message = die.addFaceEnhancement(targetFace, 'gold')
                    ? `Die ${dieNumber} face ${targetFace} enhanced with Gold (+1 Gold when scored).`
                    : 'Failed to apply gold enhancement!';
                break;
            case 'mother_of_pearl':
                message = die.addFaceEnhancement(targetFace, 'mother_of_pearl')
                    ? `Die ${dieNumber} face ${targetFace} enhanced with Mother of Pearl (adds left/right die value).`
                    : 'Failed to apply mother of pearl enhancement!';
                break;
            case 'mirror':
                message = die.addFaceEnhancement(targetFace, 'mirror')
                    ? `Die ${dieNumber} face ${targetFace} enhanced with Mirror (scores twice, including enhancements).`
                    : 'Failed to apply mirror enhancement!';
                break;
            case 'wild':
                message = die.addFaceEnhancement(targetFace, 'wild')
                    ? `Die ${dieNumber} face ${targetFace} enhanced with Wild (becomes ±1 or same when rolled).`
                    : 'Failed to apply wild enhancement!';
                break;
            case 'permanent_reduce':
                message = die.modifyFaceValue(targetFace, -1)
                    ? `Die ${dieNumber} face ${targetFace} permanently reduced by 1!`
                    : `Failed to modify die face ${targetFace}. Invalid face value.`;
                break;
            case 'permanent_increase':
                message = die.modifyFaceValue(targetFace, +1)
                    ? `Die ${dieNumber} face ${targetFace} permanently increased by 1!`
                    : `Failed to modify die face ${targetFace}. Invalid face value.`;
                break;
        }

        delete die.tempRolledFace;
        gameEngine?.saveGame?.({ silent: true });
        gameEngine?.showMessage?.(message);
        gameEngine?.updateAllUI?.();
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

    static isDieFaceEnhancer(libation) {
        return !!LibationCard.getDieFaceEnhancementType(libation);
    }

    canUse() {
        return super.canUse();
    }

    static fromData(data) {
        return new LibationCard(data);
    }

    enterEucharistTargetingMode(gameState, gameEngine = null) {
        if (!gameEngine) return;
        gameEngine.showMessage?.(`${this.name}: Click or drag onto a god on the Pantheon to increase worship!`);
        gameEngine.state.eucharistTargetingMode = { libation: this };
        gameEngine.updateAllUI?.();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LibationCard;
}
