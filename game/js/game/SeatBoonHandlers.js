/* exported SeatBoonHandlers */
/* global GAME_BALANCE, ArtifactEffects, CategoryUnlock, CardData, LibationCard, WorshipCard, ConsumableSlots, GOD_TO_CATEGORY, CATEGORY_TO_NUMBER */

/**
 * Scorecard-seat signature boons. Kept out of Boon.js / boonTimingHandlers.js.
 */
const SeatBoonHandlers = {
    LOWER_LEVEL_GODS: [
        'Hephaestus', 'Ares', 'Dionysus', 'Hermes', 'Apollo',
        'Iris', 'Hades', 'Zeus', 'Nyx',
    ],

    facesOf(gameState) {
        return (gameState.dice || []).map((d) => {
            if (typeof d.getEffectiveFace === 'function') return d.getEffectiveFace();
            return d.face ?? d.currentFace ?? 0;
        });
    },

    countsOf(faces) {
        return faces.reduce((acc, f) => {
            if (f > 0) acc[f] = (acc[f] || 0) + 1;
            return acc;
        }, {});
    },

    addGold(gameState, engine, amount, label) {
        if (engine && typeof engine.updateGoldAnimated === 'function') {
            engine.updateGoldAnimated(amount, label);
        } else {
            gameState.gold = (gameState.gold || 0) + amount;
        }
    },

    addWorship(gameState, god, amount) {
        if (!god || !amount) return;
        if (!gameState.worshipLevels) gameState.worshipLevels = {};
        gameState.worshipLevels[god] = (gameState.worshipLevels[god] || 0) + amount;
    },

    rollsCap(gameState) {
        if (typeof ArtifactEffects !== 'undefined' && ArtifactEffects.rollsPerTurn) {
            return ArtifactEffects.rollsPerTurn(gameState);
        }
        return (typeof GAME_BALANCE !== 'undefined' && GAME_BALANCE.STARTING_ROLLS) || 3;
    },

    isFirstCast(gameState) {
        return gameState.rollsLeft === this.rollsCap(gameState) - 1;
    },

    rowUnlocked(gameState, category) {
        if (typeof CategoryUnlock !== 'undefined' && CategoryUnlock.isLocked(gameState, category)) {
            return false;
        }
        if (gameState.unlockedCategories && Object.prototype.hasOwnProperty.call(gameState.unlockedCategories, category)) {
            return !!gameState.unlockedCategories[category];
        }
        return true;
    },

    filledRows(gameState) {
        const card = gameState.scorecard || {};
        return Object.keys(card).filter((k) => card[k] !== undefined).length;
    },

    dieIsEnhanced(die) {
        if (!die) return false;
        if (typeof die.hasEnhancementForCurrentFace === 'function') {
            const face = die.currentFace ?? die.face;
            const rec = die.faces?.[face];
            if (rec?.enhancements && rec.enhancements.size > 0) return true;
        }
        const face = die.currentFace ?? die.face;
        const rec = die.faces?.[face];
        return !!(rec?.enhancements && rec.enhancements.size > 0);
    },

    consumableRoom(gameState, kind) {
        if (typeof ConsumableSlots !== 'undefined') return ConsumableSlots.hasRoom(gameState, kind);
        return true;
    },

    /** @returns {boolean} true if this id was handled */
    beforeScore(boon, gameState, result, engine) {
        const faces = this.facesOf(gameState);
        const counts = this.countsOf(faces);
        const category = result.category;
        const valid = result.isValid !== false;

        switch (boon.id) {
            case 'silver_bow_of_artemis':
                if (valid && category === 'Ones' && this.isFirstCast(gameState)) {
                    result.pips += 15;
                    engine?.showMessage?.('Silver Bow of Artemis: +15 Pips on the first Cast.');
                }
                return true;

            case 'girdle_of_aphrodite': {
                let pairs = 0;
                for (let i = 0; i < faces.length - 1; i++) {
                    if (faces[i] === 2 && faces[i + 1] === 2) pairs += 1;
                }
                if (valid && pairs > 0) {
                    result.pips += pairs * 2;
                    engine?.showMessage?.(`Girdle of Aphrodite: +${pairs * 2} Pips from neighbouring 2s.`);
                }
                return true;
            }

            case 'triple_torch_of_hecate':
                if (valid && (counts[3] || 0) >= 3) {
                    result.pips += 9;
                    engine?.showMessage?.('Triple Torch of Hecate: +9 Pips (three 3s).');
                }
                return true;

            case 'mist_of_ithaca':
                if (valid && category === 'Fives' && gameState.scorecard?.Sixes === undefined) {
                    result.pips += 15;
                    engine?.showMessage?.('Mist of Ithaca: +15 Pips (Sixes still empty).');
                }
                return true;

            case 'pomegranate_of_persephone':
                if (valid && category === 'Sixes' && (gameState.ante || 1) % 2 === 0) {
                    result.pips += 12;
                    engine?.showMessage?.('Pomegranate of Persephone: +12 Pips (even Trial).');
                }
                return true;

            case 'anvil_of_hephaestus':
                if (valid && Object.values(counts).some((n) => n >= 3)) {
                    boon.anvilPips = (boon.anvilPips || 0) + 2;
                    boon.dynamicStats.pips = boon.anvilPips;
                    result.pips += boon.anvilPips;
                    engine?.showMessage?.(`Anvil of Hephaestus: +${boon.anvilPips} Pips.`);
                }
                return true;

            case 'spoils_of_ares':
                if (valid && category === 'Four of a Kind') {
                    result.favour += 50;
                    engine?.showMessage?.('Spoils of Ares: +0.5 Favour.');
                }
                return true;

            case 'dionysus_revelry':
            case 'dionysian_revelry':
                if (valid && (boon.drinkPips || 0) > 0) {
                    result.pips += boon.drinkPips;
                    boon.dynamicStats.pips = boon.drinkPips;
                    engine?.showMessage?.(`Dionysian Revelry: +${boon.drinkPips} Pips from the pour.`);
                }
                return true;

            case 'asphodel_of_hades':
            case 'helm_of_hades':
                if (valid && category === 'Yahtzee') {
                    const n = this.filledRows(gameState);
                    const bonus = n * 4;
                    result.pips += bonus;
                    engine?.showMessage?.(`Asphodel of Hades: +${bonus} Pips from ${n} filled rows.`);
                }
                return true;

            case 'veil_of_nyx':
            case 'night_of_nyx':
                if (valid && category === 'Chance') {
                    const distinct = new Set(faces.filter((f) => f > 0)).size;
                    result.favour += distinct * 10;
                    engine?.showMessage?.(`Veil of Nyx: +${(distinct * 0.1).toFixed(1)} Favour.`);
                }
                return true;

            case 'seven_sisters': {
                if (!valid) return true;
                const faceOfRow = (typeof CATEGORY_TO_NUMBER !== 'undefined')
                    ? CATEGORY_TO_NUMBER[category]
                    : null;
                if (faceOfRow && faceOfRow !== 7) {
                    const extra = (counts[7] || 0) * 7;
                    if (extra) {
                        result.pips += extra;
                        engine?.showMessage?.(`Seven Sisters: +${extra} Pips from 7s.`);
                    }
                }
                return true;
            }

            case 'trident_of_poseidon':
                if (valid && (boon.tideFavour || 0) > 0) {
                    result.favour += boon.tideFavour;
                    boon.dynamicStats.favour = boon.tideFavour;
                }
                return true;

            case 'nine_muses': {
                const dice = gameState.dice || [];
                if (valid && dice.length >= 5 && dice.every((d) => this.dieIsEnhanced(d))) {
                    result.favour += 50;
                    engine?.showMessage?.('Nine Muses: +0.5 Favour (all five dressed).');
                }
                return true;
            }

            default:
                return false;
        }
    },

    afterScore(boon, gameState, result, engine) {
        const paid = (result.finalScore || 0) > 0;
        switch (boon.id) {
            case 'spoils_of_ares':
                if (paid && result.category === 'Four of a Kind') {
                    this.addGold(gameState, engine, 4, 'Spoils of Ares');
                    engine?.showMessage?.('Spoils of Ares: +4 Gold.');
                }
                return true;

            case 'caduceus_of_hermes':
                if (paid && ['Small Straight', 'Large Straight', 'Extra Long Straight'].includes(result.category)) {
                    this.addGold(gameState, engine, 3, 'Caduceus of Hermes');
                    engine?.showMessage?.('Caduceus of Hermes: +3 Gold on the road.');
                }
                return true;

            case 'pomegranate_of_persephone':
                if (paid && result.category === 'Sixes' && (gameState.ante || 1) % 2 === 1) {
                    this.addGold(gameState, engine, 6, 'Pomegranate of Persephone');
                    engine?.showMessage?.('Pomegranate of Persephone: +6 Gold (odd Trial).');
                }
                return true;

            case 'dionysus_revelry':
            case 'dionysian_revelry':
                if (paid && result.category === 'Full House') {
                    this.grantRandomLibation(boon, gameState, engine);
                }
                return true;

            case 'pythian_course':
                if (paid && result.category === 'Large Straight' && this.isHighCourse(this.facesOf(gameState))) {
                    this.grantRandomBlessing(boon, gameState, engine);
                }
                return true;

            case 'spectrum_of_iris':
            case 'rainbow_veil_of_iris':
                if (paid && result.category === 'Extra Long Straight') {
                    this.LOWER_LEVEL_GODS.forEach((god) => {
                        const row = typeof GOD_TO_CATEGORY !== 'undefined' ? Object.keys(GOD_TO_CATEGORY).find((c) => GOD_TO_CATEGORY[c] === god) : null;
                        if (row && !this.rowUnlocked(gameState, row)) return;
                        this.addWorship(gameState, god, 1);
                    });
                    engine?.showMessage?.('Spectrum of Iris: +1 level to every lower pantheon row.');
                }
                return true;

            case 'the_lots_of_zeus':
            case 'thunderbolt_of_zeus':
                if (paid && result.category === 'Heureka') {
                    this.addWorship(gameState, 'Zeus', 1);
                    this.addWorship(gameState, 'Hades', 1);
                    if (this.rowUnlocked(gameState, 'Eights')) this.addWorship(gameState, 'Poseidon', 1);
                    engine?.showMessage?.('The Lots of Zeus: +1 to Heureka, The House, and Eights.');
                }
                return true;

            case 'trident_of_poseidon':
                if (paid) {
                    gameState.scoresThisRun = (gameState.scoresThisRun || 0) + 1;
                    if (gameState.scoresThisRun % 8 === 0) {
                        boon.tideFavour = (boon.tideFavour || 0) + 10;
                        boon.dynamicStats.favour = boon.tideFavour;
                        engine?.showMessage?.('Trident of Poseidon: the eighth wave. +0.1 Favour.');
                    }
                }
                return true;

            default:
                return false;
        }
    },

    isHighCourse(faces) {
        const set = new Set(faces.filter((f) => f > 0));
        return [2, 3, 4, 5, 6].every((n) => set.has(n));
    },

    grantRandomLibation(boon, gameState, engine) {
        if (!this.consumableRoom(gameState, 'libation')) {
            engine?.showMessage?.('Dionysian Revelry: the mixing bowl is full.');
            return;
        }
        const pool = (typeof CardData !== 'undefined' && CardData.libations) || [];
        if (!pool.length) return;
        const data = pool[boon._randomInt(pool.length)];
        if (!data) return;
        const card = (typeof LibationCard !== 'undefined')
            ? new LibationCard(data)
            : { ...data, type: 'libation' };
        if (!gameState.consumables) gameState.consumables = [];
        gameState.consumables.push(card);
        engine?.showMessage?.(`Dionysian Revelry: ${card.name} poured into your hand.`);
    },

    grantRandomBlessing(boon, gameState, engine) {
        if (!this.consumableRoom(gameState, 'worship')) {
            engine?.showMessage?.('Pythian Course: the blessing rail is full.');
            return;
        }
        const pool = (typeof CardData !== 'undefined' && CardData.worship) || [];
        if (!pool.length) return;
        const data = pool[boon._randomInt(pool.length)];
        if (!data) return;
        const card = (typeof WorshipCard !== 'undefined')
            ? new WorshipCard(data)
            : { ...data, type: 'worship' };
        if (!gameState.consumables) gameState.consumables = [];
        gameState.consumables.push(card);
        engine?.showMessage?.(`Pythian Course: ${card.name}.`);
    },

    afterRoll() {
        return false;
    },

    turnStart() {
        return false;
    },
};

if (typeof window !== 'undefined') window.SeatBoonHandlers = SeatBoonHandlers;
