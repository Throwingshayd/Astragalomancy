/**
 * URL/query test presets for GameEngine (playtest, ?test=, ?enhance=).
 * @module GameEngineTestModes
 */

class GameEngineTestModes {
    /**
     * Apply all URL-driven test presets after base state is initialized.
     * @param {GameEngine} engine
     * @param {string} seed
     */
    static applyFromUrl(engine, seed) {
        const urlParams = new URLSearchParams(window.location.search);
        const testMode = urlParams.get('test');

        if (testMode === 'highfaces') {
            GameEngineTestModes.applyHighFaces(engine);
        }
        if (testMode === 'seven_sided') {
            GameEngineTestModes.applySevenSided(engine);
        }
        if (testMode === 'yahtzee') {
            GameEngineTestModes.applyYahtzee(engine);
        }
        if (testMode === 'winning') {
            GameEngineTestModes.applyWinningHands(engine);
            engine.state.winningTestMode = true;
        }
        if (testMode && testMode.startsWith('boon:')) {
            const boonIds = testMode.replace('boon:', '').trim().split(',').map(s => s.trim()).filter(Boolean);
            boonIds.forEach(id => GameEngineTestModes.applyBoon(engine, id));
        }
        if (testMode && testMode.startsWith('libation:')) {
            const libId = testMode.replace('libation:', '').trim();
            GameEngineTestModes.applyLibation(engine, libId);
        }
        const enhanceParam = urlParams.get('enhance');
        if (enhanceParam) {
            GameEngineTestModes.applyEnhancement(engine, enhanceParam);
        }
    }

    /** @param {GameEngine} engine @param {string} enhancement */
    static applyEnhancement(engine, enhancement) {
        const valid = ['iron', 'parchment', 'gold', 'blessed'];
        if (!valid.includes(enhancement)) return;
        const dice = engine.state.dice || [];
        if (dice.length < 2) return;
        dice[0].addFaceEnhancement(6, enhancement);
        dice[1].addFaceEnhancement(5, enhancement);
        if (dice.length >= 3) dice[2].addFaceEnhancement(4, enhancement);
        if (typeof Logger !== 'undefined') Logger.info(`🧪 TEST MODE: Added ${enhancement} to dice faces 6,5,4`);
    }

    /** @param {GameEngine} engine @param {string} boonId */
    static applyBoon(engine, boonId) {
        const boonData = typeof CardData !== 'undefined' && CardData.boons
            ? CardData.boons.find(j => j.id === boonId)
            : null;
        if (!boonData) {
            if (typeof Logger !== 'undefined') Logger.warn(`Test mode: Boon "${boonId}" not found`);
            return;
        }
        const boon = new Boon(boonData);
        engine.state.boons.push(boon);
        engine.state.gold = Math.max(engine.state.gold, 20);
        if (typeof Logger !== 'undefined') Logger.info(`🧪 TEST MODE: Injected boon "${boonId}"`);
    }

    /** @param {GameEngine} engine @param {string} libId */
    static applyLibation(engine, libId) {
        const libData = typeof CardData !== 'undefined' && CardData.libations
            ? CardData.libations.find(l => l.id === libId)
            : null;
        if (!libData) {
            if (typeof Logger !== 'undefined') Logger.warn(`Test mode: Libation "${libId}" not found`);
            return;
        }
        const libation = new LibationCard(libData);
        engine.state.consumables.push(libation);
        if (typeof Logger !== 'undefined') Logger.info(`🧪 TEST MODE: Injected libation "${libId}"`);
    }

    /** @param {GameEngine} engine */
    static applyHighFaces(engine) {
        Logger.info('🧪 TEST MODE: High Faces (7s, 8s, 9s) enabled');

        engine.state.unlockedCategories.Sevens = true;
        engine.state.unlockedCategories.Eights = true;
        engine.state.unlockedCategories.Nines = true;

        engine.state.dice[0].faces[6].modifiedValue = 7;
        Logger.debug('Die 1: Face 6 → 7');
        engine.state.dice[1].faces[6].modifiedValue = 8;
        Logger.debug('Die 2: Face 6 → 8');
        engine.state.dice[2].faces[6].modifiedValue = 9;
        Logger.debug('Die 3: Face 6 → 9');
        engine.state.dice[3].faces[5].modifiedValue = 7;
        Logger.debug('Die 4: Face 5 → 7');
        engine.state.dice[4].faces[4].modifiedValue = 8;
        Logger.debug('Die 5: Face 4 → 8');

        engine.state.gold = 50;

        Logger.info('✅ Test mode applied: Dice now have faces with values 7, 8, and 9');
        Logger.info('📋 Test Setup:');
        Logger.info('  - Die 1: Face 6 = 7');
        Logger.info('  - Die 2: Face 6 = 8');
        Logger.info('  - Die 3: Face 6 = 9');
        Logger.info('  - Die 4: Face 5 = 7');
        Logger.info('  - Die 5: Face 4 = 8');
        Logger.info('  - Categories Sevens, Eights, Nines unlocked');
        Logger.info('  - Starting gold: 50');
    }

    /** @param {GameEngine} engine */
    static applySevenSided(engine) {
        if (typeof Logger !== 'undefined') Logger.info('🧪 TEST MODE: 7-sided dice');
        engine.state.bonusYahtzees = 1;
        engine.state.unlockedCategories.Sevens = true;
        engine.state.forcedDiceValues = engine.state.forcedDiceValues || {};
        engine.state.forcedDiceValues.sevenSidedFirstRoll = [7, 1, 2, 3, 4];
    }

    /** @param {GameEngine} engine */
    static applyYahtzee(engine) {
        if (typeof Logger !== 'undefined') Logger.info('🧪 TEST MODE: Yahtzee 1–9 — dice forced to [1,1,1,1,1] through [9,9,9,9,9]; 7/8/9 locked like normal');
        engine.state.forcedDiceValues = engine.state.forcedDiceValues || {};
        engine.state.forcedDiceValues.winningSequence = [
            [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3], [4, 4, 4, 4, 4],
            [5, 5, 5, 5, 5], [6, 6, 6, 6, 6], [7, 7, 7, 7, 7], [8, 8, 8, 8, 8], [9, 9, 9, 9, 9]
        ];
        engine.state.winningTestMode = true;
    }

    /** @param {GameEngine} engine */
    static applyWinningHands(engine) {
        if (typeof Logger !== 'undefined') Logger.info('🧪 TEST MODE: Winning Hands — dice forced to valid hands per turn');
        engine.state.forcedDiceValues = engine.state.forcedDiceValues || {};
        engine.state.forcedDiceValues.winningSequence = [
            [1, 2, 3, 4, 5],
            [1, 1, 1, 1, 1],
            [2, 2, 2, 2, 2],
            [3, 3, 3, 3, 3],
            [4, 4, 4, 4, 4],
            [5, 5, 5, 5, 5],
            [6, 6, 6, 6, 6],
            [2, 2, 2, 4, 5],
            [1, 2, 3, 4, 6],
            [3, 3, 3, 5, 5],
            [4, 4, 4, 4, 5],
            [1, 2, 3, 4, 5],
            [6, 6, 6, 6, 6]
        ];
        engine.state.gold = Math.max(engine.state.gold, 25);
        if (typeof Logger !== 'undefined') Logger.info('  - 13 hands pre-set (Chance→Yahtzee), gold: 25');
    }
}

if (typeof window !== 'undefined') window.GameEngineTestModes = GameEngineTestModes;
