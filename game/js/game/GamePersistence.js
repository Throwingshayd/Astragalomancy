/* exported GamePersistence */
/* global Logger, SeededRNG, Die, ArtifactDice, CardData, Boon, Artifact, WorshipCard, LibationCard */

const GamePersistence = {
    DEFAULT_WORSHIP_LEVELS: {
        'Artemis': 0, 'Aphrodite': 0, 'Morpheus': 0, 'Hera': 0,
        'Athena': 0, 'Heracles': 0, 'Hephaestus': 0, 'Ares': 0,
        'Dionysus': 0, 'Hermes': 0, 'Apollo': 0, 'Zeus': 0, 'Nyx': 0,
        'The Pleiades': 0, 'Poseidon': 0, 'The Nine Muses': 0,
        "Pandora's Box": 0
    },

    serialize(state) {
        const toPlain = (obj) => (obj && typeof obj.toJSON === 'function' ? obj.toJSON() : obj);
        const payload = {
            ...state,
            dice: Array.isArray(state.dice)
                ? state.dice.map((d, i) => toPlain(d) || { currentFace: 0, dieId: i + 1 })
                : [],
            boons: Array.isArray(state.boons)
                ? state.boons.map(c => toPlain(c)).filter(Boolean)
                : [],
            artifacts: Array.isArray(state.artifacts)
                ? state.artifacts.map(c => toPlain(c)).filter(Boolean)
                : [],
            consumables: Array.isArray(state.consumables)
                ? state.consumables.map(c => toPlain(c)).filter(Boolean)
                : [],
            worshipLevels: state.worshipLevels && typeof state.worshipLevels === 'object'
                ? { ...state.worshipLevels }
                : {},
            libationPours: state.libationPours && typeof state.libationPours === 'object'
                ? { ...state.libationPours }
                : {},
            scorecard: state.scorecard && typeof state.scorecard === 'object' ? { ...state.scorecard } : {},
            pantheonDevotion: state.pantheonDevotion && typeof state.pantheonDevotion === 'object'
                ? { ...state.pantheonDevotion }
                : {},
            devotionCapacity: state.devotionCapacity && typeof state.devotionCapacity === 'object'
                ? { ...state.devotionCapacity }
                : {},
            categoryGodBinding: state.categoryGodBinding && typeof state.categoryGodBinding === 'object'
                ? { ...state.categoryGodBinding }
                : {},
            categoryScoringOverride: state.categoryScoringOverride && typeof state.categoryScoringOverride === 'object'
                ? { ...state.categoryScoringOverride }
                : {},
            unlockedCategories: state.unlockedCategories && typeof state.unlockedCategories === 'object'
                ? { ...state.unlockedCategories }
                : { 'Sevens': false, 'Eights': false, 'Nines': false, 'Heureka': false, 'Extra Long Straight': false, "Pandora's Box": false }
        };
        delete payload.diceEffects;
        delete payload.pipsBonuses;
        delete payload.abilities;
        delete payload.globalBonuses;
        delete payload.enhancementMap;
        delete payload.rolledBonusYahtzees;
        delete payload.worshipFavourMultiplier;
        delete payload.worshipFavourMult;
        return payload;
    },

    save(engine) {
        if (!engine.canSave()) {
            Logger.warn('Save aborted: Game not in safe state');
            return false;
        }

        if (engine.dataManager) {
            try {
                engine.updateResumePhase();
                const state = engine.state;
                const payload = {
                    gameState: this.serialize(state),
                    prngState: engine.prng?.getState?.() ?? null,
                    resumePhase: state.resumePhase ?? 'play'
                };
                engine.dataManager.saveGame(payload);
                Logger.info('Game saved successfully');
                return true;
            } catch (error) {
                Logger.error('Save failed:', error);
                engine.showMessage('Failed to save game!', 3000);
                return false;
            }
        }

        Logger.error('DataManager not available');
        return false;
    },

    rehydrate(engine, plain, prngState = null) {
        if (!plain) return plain;
        const state = { ...plain };

        const seed = state.seed || 'CONTINUED';
        engine.prng = new SeededRNG(seed);
        if (prngState && engine.prng?.setState) {
            engine.prng.setState(prngState);
        }

        const defaultWorship = this.DEFAULT_WORSHIP_LEVELS;
        const incomingWorship = state.worshipLevels && typeof state.worshipLevels === 'object'
            ? { ...state.worshipLevels }
            : {};
        state.worshipLevels = { ...defaultWorship, ...incomingWorship };

        if (!state.libationPours || typeof state.libationPours !== 'object') state.libationPours = {};

        state.scorecard = state.scorecard && typeof state.scorecard === 'object' ? state.scorecard : {};
        state.pantheonDevotion = state.pantheonDevotion && typeof state.pantheonDevotion === 'object'
            ? state.pantheonDevotion
            : {};
        state.devotionCapacity = state.devotionCapacity && typeof state.devotionCapacity === 'object'
            ? state.devotionCapacity
            : {};
        state.categoryGodBinding = state.categoryGodBinding && typeof state.categoryGodBinding === 'object'
            ? state.categoryGodBinding
            : {};
        state.categoryScoringOverride = state.categoryScoringOverride && typeof state.categoryScoringOverride === 'object'
            ? state.categoryScoringOverride
            : {};
        state.unlockedCategories = state.unlockedCategories && typeof state.unlockedCategories === 'object'
            ? { 'Sevens': false, 'Eights': false, 'Nines': false, 'Heureka': false, 'Extra Long Straight': false, "Pandora's Box": false, ...state.unlockedCategories }
            : { 'Sevens': false, 'Eights': false, 'Nines': false, 'Heureka': false, 'Extra Long Straight': false, "Pandora's Box": false };

        state.yahtzeesRolledThisRun = state.yahtzeesRolledThisRun ?? (state.bonusYahtzees || 0) + 1;
        state.trialArtifactId = typeof state.trialArtifactId === 'string' ? state.trialArtifactId : null;
        state.trialArtifactAnte = Number.isFinite(state.trialArtifactAnte) ? state.trialArtifactAnte : null;
        state.trialArtifactBought = !!state.trialArtifactBought;

        state.held = Array.isArray(state.held) ? state.held : [];
        state.eyeFloorRank = Number.isFinite(state.eyeFloorRank) ? state.eyeFloorRank : -1;
        state.packs = Array.isArray(state.packs) ? state.packs : [];

        delete state.diceEffects;
        delete state.pipsBonuses;
        delete state.abilities;
        delete state.globalBonuses;
        delete state.enhancementMap;
        delete state.rolledBonusYahtzees;
        if (state.worshipLevelFavourScale == null && state.worshipFavourMultiplier != null) {
            state.worshipLevelFavourScale = state.worshipFavourMultiplier;
        }
        delete state.worshipFavourMultiplier;
        delete state.worshipFavourMult;

        state.dice = Array.isArray(state.dice) ? state.dice : [];
        state.dice = state.dice.map((d, i) => {
            const die = new Die(i + 1);
            if (d && typeof die.fromJSON === 'function') die.fromJSON(d);
            return die;
        });
        if (state.dice.length < 5) {
            while (state.dice.length < 5) {
                state.dice.push(new Die(state.dice.length + 1));
            }
        }
        if (typeof ArtifactDice !== 'undefined') ArtifactDice.syncHeld(state);

        state.boons = Array.isArray(state.boons) ? state.boons : [];
        state.boons = state.boons.map((saved) => {
            if (!saved || !saved.id) return null;
            const data = CardData?.boons?.find(j => j.id === saved.id) ?? null;
            if (!data) {
                Logger.warn(`Rehydrate: Boon "${saved.id}" not found in CardData`);
                return null;
            }
            const boon = new Boon(data);
            if (typeof boon.fromJSON === 'function') boon.fromJSON(saved);
            return boon;
        }).filter(Boolean);

        state.artifacts = Array.isArray(state.artifacts) ? state.artifacts : [];
        state.artifacts = state.artifacts.map((saved) => {
            if (!saved || !saved.id) return null;
            let data = null;
            if (CardData?.artifacts) {
                for (const pair of Object.values(CardData.artifacts)) {
                    if (pair?.base?.id === saved.id || pair?.upgraded?.id === saved.id) {
                        data = (pair.base?.id === saved.id ? pair.base : pair.upgraded) || pair.base;
                        break;
                    }
                }
            }
            if (!data) {
                Logger.warn(`Rehydrate: Artifact "${saved.id}" not found`);
                return null;
            }
            const artifact = new Artifact(data);
            if (typeof artifact.fromJSON === 'function') artifact.fromJSON(saved);
            return artifact;
        }).filter(Boolean);

        state.consumables = Array.isArray(state.consumables) ? state.consumables : [];
        state.consumables = state.consumables.map((saved) => {
            if (!saved || !saved.id) return null;
            const type = saved.type || 'libation';
            let data = (type === 'worship' && CardData?.worship)
                ? CardData.worship.find(c => c.id === saved.id)
                : (CardData?.libations ? CardData.libations.find(c => c.id === saved.id) : null);
            if (!data && CardData?.worship) data = CardData.worship.find(c => c.id === saved.id);
            if (!data) {
                Logger.warn(`Rehydrate: consumable "${saved.id}" not found`);
                return null;
            }
            const isWorship = CardData.worship?.some(w => w.id === saved.id);
            const card = isWorship ? new WorshipCard(data) : new LibationCard(data);
            if (typeof card.fromJSON === 'function') card.fromJSON(saved);
            return card;
        }).filter(Boolean);

        return state;
    }
};

if (typeof window !== 'undefined') window.GamePersistence = GamePersistence;
