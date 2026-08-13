/**
 * Trial clear / fail / early Depart (hubris).
 * Kept out of GameEngine to hold the architecture line ceiling.
 */
const TrialCompletion = {
    availableCategories(state) {
        const upperCats = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes'];
        const lowerCats = [
            'Three of a Kind', 'Small Straight', 'Full House', 'Four of a Kind',
            'Large Straight', 'Yahtzee', 'Chance',
        ];
        const highCats = [];
        if (state.unlockedCategories?.Sevens) highCats.push('Sevens');
        if (state.unlockedCategories?.Eights) highCats.push('Eights');
        if (state.unlockedCategories?.Nines) highCats.push('Nines');
        return [...upperCats, ...lowerCats, ...highCats];
    },

    categoryFilled(state, category) {
        return typeof DevotionUtils !== 'undefined'
            ? DevotionUtils.hasBeenScored(state, category)
            : state.scorecard[category] !== undefined;
    },

    areAllCategoriesFilled(state) {
        return this.availableCategories(state).every((c) => this.categoryFilled(state, c));
    },

    countUnfilledCategories(state) {
        return this.availableCategories(state).filter((c) => !this.categoryFilled(state, c)).length;
    },

    /** Over threshold with rites still open — Depart is available. */
    canDepartEarly(state) {
        if (!state || state.gameOver || state.transitioningToShop) return false;
        if (state.totalScore < state.scoreThreshold) return false;
        return !this.areAllCategoriesFilled(state);
    },

    endAnte(engine) {
        const allCategoriesFilled = this.areAllCategoriesFilled(engine.state);
        const scoreThresholdReached = engine.state.totalScore >= engine.state.scoreThreshold;

        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('ante_check', {
                allCategoriesFilled,
                scoreThresholdReached,
                totalScore: engine.state.totalScore,
                scoreThreshold: engine.state.scoreThreshold,
                ante: engine.state.ante,
            });
        }

        if (allCategoriesFilled && scoreThresholdReached) {
            if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
                PlaytestRecorder.log('ante_cleared', {
                    ante: engine.state.ante,
                    totalScore: engine.state.totalScore,
                    scoreThreshold: engine.state.scoreThreshold,
                    state: PlaytestRecorder.captureState(engine),
                });
            }
            if (engine.sound) engine.sound.play('gong', { pitch: 0.9, volume: 0.5 });
            engine.showMessage(
                `Trial ${engine.state.ante} cleared! Score: ${engine.state.totalScore}/${engine.state.scoreThreshold}`
            );

            if (engine.state.ante >= 13 && !engine.state.endlessMode) {
                engine.state.endlessMode = true;
                engine.showMessage('The Apotheosis is complete! The Odyssey begins...');
            }

            const upperCats = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes'];
            const lowerCats = [
                'Three of a Kind', 'Small Straight', 'Full House', 'Four of a Kind',
                'Large Straight', 'Yahtzee', 'Chance',
            ];
            const sumUpper = upperCats.reduce((s, c) => s + (engine.state.scorecard[c] || 0), 0);
            const sumLower = lowerCats.reduce((s, c) => s + (engine.state.scorecard[c] || 0), 0);
            const upperBonus = sumUpper >= 63 ? 35 : 0;
            const lowerBonus = lowerCats.every((c) => {
                const v = engine.state.scorecard[c];
                return v !== undefined && (typeof v === 'number' ? v > 0 : true);
            }) ? 35 : 0;

            this.runEndOfAnteTallyThenOpenShop(engine, { sumUpper, sumLower, upperBonus, lowerBonus });
        } else if (allCategoriesFilled && !scoreThresholdReached) {
            engine.state.gameOver = true;
            engine.showMessage(
                `Trial ${engine.state.ante} failed! Score: ${engine.state.totalScore}/${engine.state.scoreThreshold}`
            );
            if (typeof Logger !== 'undefined') {
                Logger.info('Trial failed (card full, under threshold)', {
                    ante: engine.state.ante,
                    score: engine.state.totalScore,
                    threshold: engine.state.scoreThreshold,
                    blind: engine.state.activeBlind,
                });
            }
            engine.showGameOverScreen(false, { reason: 'ante_threshold_failed' });
            engine.dataManager.updateStats({
                won: false,
                score: engine.state.totalScore,
                ante: engine.state.ante,
                threshold: engine.state.scoreThreshold,
                blind: engine.state.activeBlind,
                goldEarned: engine.state.gold,
            });
        } else {
            Logger.warn('endAnte() called but not all categories filled yet', {
                filled: allCategoriesFilled,
                threshold: scoreThresholdReached,
                totalScore: engine.state.totalScore,
                scoreThreshold: engine.state.scoreThreshold,
            });
        }
    },

    /**
     * Hubris: leave the Trial early once over the required score.
     * Unfilled categories stay empty. Mid-shops already missed stay missed.
     * Cashout is normal offerings + interest (no leftover-turn gold).
     */
    departEarly(engine) {
        if (engine.isScoring) return;
        if (!this.canDepartEarly(engine.state)) return;

        const unused = this.countUnfilledCategories(engine.state);
        if (typeof PlaytestRecorder !== 'undefined' && PlaytestRecorder.active) {
            PlaytestRecorder.log('ante_depart_hubris', {
                ante: engine.state.ante,
                totalScore: engine.state.totalScore,
                scoreThreshold: engine.state.scoreThreshold,
                unusedCategories: unused,
                state: PlaytestRecorder.captureState(engine),
            });
        }
        if (engine.sound) engine.sound.play('gong', { pitch: 1.05, volume: 0.45 });
        engine.showMessage(
            `Hubris — Trial ${engine.state.ante} left unfinished. Score: ${engine.state.totalScore}/${engine.state.scoreThreshold}`
        );

        if (engine.state.ante >= 13 && !engine.state.endlessMode) {
            engine.state.endlessMode = true;
            engine.showMessage('The Apotheosis is complete! The Odyssey begins...');
        }

        this.finishAnteAndOpenShop(engine, {
            pantheonTotal: engine.state.totalScore,
            pantheonThreshold: engine.state.scoreThreshold,
            hubrisDepart: true,
            unusedCategories: unused,
        });
    },

    runEndOfAnteTallyThenOpenShop(engine, { sumUpper, sumLower, upperBonus, lowerBonus }) {
        const totalPantheon = (sumUpper + sumLower) + (upperBonus + lowerBonus);
        const thresholdBeat = engine.state.scoreThreshold;
        this.finishAnteAndOpenShop(engine, {
            pantheonTotal: totalPantheon,
            pantheonThreshold: thresholdBeat,
        });
    },

    finishAnteAndOpenShop(engine, opts = {}) {
        engine.state.ante++;
        engine.state.turn = 1;

        engine.state.boons.forEach((boon) => {
            if (boon.timing && boon.timing.ante_end) {
                boon.onTimingEvent('ante_end', engine.state, {}, engine);
            }
        });

        engine.state.lastWorshipGod = null;

        if (typeof WorshipCard !== 'undefined') {
            WorshipCard.tickHeldDevotionTrials(engine.state, engine);
        }

        BlindDirector.prepareNextAnte(engine);
        engine.showInterestThenOpenShop(opts);
    },
};

if (typeof window !== 'undefined') window.TrialCompletion = TrialCompletion;
