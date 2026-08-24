/* exported NearMissBoonHandlers */
/* global Logger, GAME_BALANCE, ArtifactEffects, TrialCompletion, NumberFormat */

/**
 * Near-miss redesign handlers (Elpis, Horse, Cerberus, Medusa, Icarus,
 * Forgetfulness, Narcissus, Odysseus, Ploutos, Bellows, Typhon).
 * Kept out of Boon.js / boonTimingHandlers.js / GameEngine.js.
 */
const NearMissBoonHandlers = {
    FAVOUR_PER_TENTH: 10, // 0.1 Favour

    faceOf(die) {
        if (!die) return 0;
        if (typeof die.getEffectiveFace === 'function') return die.getEffectiveFace();
        return die.face ?? die.currentFace ?? 0;
    },

    rollsCap(gameState) {
        if (typeof ArtifactEffects !== 'undefined' && ArtifactEffects.rollsPerTurn) {
            return ArtifactEffects.rollsPerTurn(gameState);
        }
        return (typeof GAME_BALANCE !== 'undefined' && GAME_BALANCE.STARTING_ROLLS) || 3;
    },

    isDisabled(boon, gameState) {
        if (!boon || !gameState) return false;
        if (gameState.narcissusSelfDisabled && boon.id === 'reflection_of_narcissus') return true;
        if (gameState.narcissusDisabledId && boon.id === gameState.narcissusDisabledId) return true;
        if (gameState.odysseusDisabled && boon.id === 'the_odyssey') return true;
        return false;
    },

    /**
     * Destroy a boon; Elpis (pandoras_jar) cannot be destroyed and gains +10 Pips.
     * Sell is not destroy — do not call this on sell.
     */
    destroyBoon(gameState, target, engine, message) {
        if (!gameState?.boons?.length || !target) return false;
        const id = typeof target === 'string' ? target : target.id;
        if (id === 'pandoras_jar') {
            engine?.showMessage?.('Elpis stays in the jar.');
            return false;
        }
        const idx = gameState.boons.findIndex((j) => j === target || j.id === id);
        if (idx === -1) return false;
        const doomed = gameState.boons[idx];
        gameState.boons.splice(idx, 1);
        if (message) engine?.showMessage?.(message, 3500);
        if (typeof Logger !== 'undefined') Logger.info(`Boon destroyed: ${doomed.name}`);

        const elpis = gameState.boons.find((j) => j.id === 'pandoras_jar');
        if (elpis) {
            elpis.elpisPips = (elpis.elpisPips || 0) + 10;
            elpis.dynamicStats = elpis.dynamicStats || {};
            elpis.dynamicStats.pips = elpis.elpisPips;
            engine?.showMessage?.(`Elpis in the Jar: +10 Pips (total +${elpis.elpisPips})`, 3000);
        }
        return true;
    },

    /** Turn start: Narcissus + Cerberus watch reset. */
    turnStart(boon, gameState, engine) {
        if (boon.id === 'reflection_of_narcissus') {
            gameState.narcissusDisabledId = null;
            gameState.narcissusSelfDisabled = false;
            const others = (gameState.boons || []).filter((j) => j.id !== 'reflection_of_narcissus');
            if (others.length === 0) {
                gameState.narcissusSelfDisabled = true;
                engine?.showMessage?.('Narcissus: stuck on his own reflection…', 3000);
                return;
            }
            gameState.rollsLeft = (gameState.rollsLeft || 0) + 1;
            const pick = others[boon._randomInt
                ? boon._randomInt(others.length, engine)
                : Math.floor((engine?.prng?.random?.() ?? 0) * others.length)];
            gameState.narcissusDisabledId = pick.id;
            engine?.showMessage?.(
                `Narcissus: +1 reroll. ${pick.name} looks away (disabled).`,
                3500,
            );
            return;
        }

        if (boon.id === 'cerberus_watch') {
            gameState.cerberusWatched = [];
            gameState.cerberusBroken = false;
        }
    },

    /** After faces land — Medusa hold, Typhon counter, Icarus climb/melt. */
    afterRoll(boon, gameState, engine, { isReroll, rollsLeftAfter } = {}) {
        if (this.isDisabled(boon, gameState)) return;

        if (boon.id === 'medusas_gaze') {
            let n = 0;
            (gameState.dice || []).forEach((die, i) => {
                if (this.faceOf(die) === 6) {
                    if (gameState.held) gameState.held[i] = true;
                    die.held = true;
                    n++;
                }
            });
            if (n > 0) engine?.showMessage?.(`Medusa's Gaze: ${n} six${n > 1 ? 'es' : ''} turned to stone!`);
            return;
        }

        if (boon.id === 'typhon') {
            let ones = 0;
            const held = gameState.held || [];
            (gameState.dice || []).forEach((die, i) => {
                if (held[i]) return;
                if (this.faceOf(die) === 1) ones++;
            });
            if (ones <= 0) return;
            boon.typhonOnes = (boon.typhonOnes || 0) + ones;
            const gained = Math.floor(boon.typhonOnes / 10) - Math.floor((boon.typhonOnes - ones) / 10);
            if (gained > 0) {
                boon.typhonPips = (boon.typhonPips || 0) + gained;
                boon.dynamicStats = boon.dynamicStats || {};
                boon.dynamicStats.pips = boon.typhonPips;
                engine?.showMessage?.(
                    `Typhon: +${gained} Pip${gained > 1 ? 's' : ''} (${boon.typhonOnes} ones rolled)`,
                    2500,
                );
            }
            return;
        }

        if (boon.id === 'icarus_wings') {
            if (isReroll) {
                boon.icarusFavour = (boon.icarusFavour || 0) + this.FAVOUR_PER_TENTH;
                boon.dynamicStats = boon.dynamicStats || {};
                boon.dynamicStats.favour = boon.icarusFavour;
                engine?.showMessage?.(
                    `Wax Wings: +0.1 Favour (total +${(boon.icarusFavour / 100).toFixed(1)})`,
                    2500,
                );
            }
            if (rollsLeftAfter === 0) {
                this.destroyBoon(
                    gameState,
                    boon,
                    engine,
                    "Icarus' Wings: the wax melts — all rolls spent!",
                );
            }
        }
    },

    beforeScore(boon, gameState, result, engine) {
        if (this.isDisabled(boon, gameState)) return;
        if (!result?.isValid) return;

        switch (boon.id) {
            case 'pandoras_jar': {
                const pips = boon.elpisPips || 0;
                if (pips > 0) {
                    result.pips += pips;
                    boon.dynamicStats = boon.dynamicStats || {};
                    boon.dynamicStats.pips = pips;
                    engine?.showMessage?.(`Elpis in the Jar: +${pips} Pips!`);
                }
                break;
            }
            case 'cerberus_watch': {
                if (gameState.cerberusBroken) break;
                const watched = gameState.cerberusWatched || [];
                if (watched.length < 3) break;
                const held = gameState.held || [];
                const allStill = watched.every((i) => held[i]);
                if (!allStill) break;
                result.pips += 9;
                result._cerberusDieIndices = [...watched];
                boon.dynamicStats = boon.dynamicStats || {};
                boon.dynamicStats.pips = 9;
                engine?.showMessage?.("Cerberus' Watch: +9 Pips — the gate held!");
                break;
            }
            case 'medusas_gaze': {
                const sixes = (gameState.dice || []).filter((d) => this.faceOf(d) === 6).length;
                if (sixes > 0) {
                    const bonus = sixes * 6;
                    result.pips += bonus;
                    boon.dynamicStats = boon.dynamicStats || {};
                    boon.dynamicStats.pips = bonus;
                    engine?.showMessage?.(`Medusa's Gaze: +${bonus} Pips (${sixes}×6)!`);
                }
                break;
            }
            case 'icarus_wings': {
                const fav = boon.icarusFavour || 0;
                if (fav > 0) {
                    result.favour += fav;
                    boon.dynamicStats = boon.dynamicStats || {};
                    boon.dynamicStats.favour = fav;
                    engine?.showMessage?.(
                        `Wax Wings: +${typeof NumberFormat !== 'undefined' ? NumberFormat.favourContrib(fav) : fav / 100} Favour!`,
                    );
                }
                break;
            }
            case 'typhon': {
                const pips = boon.typhonPips || 0;
                if (pips > 0) {
                    result.pips += pips;
                    boon.dynamicStats = boon.dynamicStats || {};
                    boon.dynamicStats.pips = pips;
                    engine?.showMessage?.(`Typhon: +${pips} Pips!`);
                }
                break;
            }
            case 'lethe_waters': {
                const fav = boon.letheFavour || 0;
                if (fav > 0) {
                    result.favour += fav;
                    boon.dynamicStats = boon.dynamicStats || {};
                    boon.dynamicStats.favour = fav;
                    engine?.showMessage?.(
                        `Forgetfulness: +${typeof NumberFormat !== 'undefined' ? NumberFormat.favourContrib(fav) : fav / 100} Favour!`,
                    );
                }
                break;
            }
            case 'bellows_of_war': {
                const faces = (gameState.dice || []).map((d) => this.faceOf(d));
                const counts = faces.reduce((acc, f) => {
                    if (f > 0) acc[f] = (acc[f] || 0) + 1;
                    return acc;
                }, {});
                const hasTriple = Object.values(counts).some((c) => c >= 3);
                if (hasTriple) {
                    boon.bellowsBank = (boon.bellowsBank || 0) + 3;
                    boon.dynamicStats = boon.dynamicStats || {};
                    boon.dynamicStats.pips = boon.bellowsBank;
                    boon.dynamicStats.other = `Bank ${boon.bellowsBank}`;
                }
                if (result.category === 'Three of a Kind' && (boon.bellowsBank || 0) > 0) {
                    const bank = boon.bellowsBank;
                    result.pips += bank;
                    engine?.showMessage?.(`Twenty Bellows: +${bank} Pips poured into The Anvil!`);
                    boon.bellowsBank = 0;
                    boon.dynamicStats.pips = 0;
                    boon.dynamicStats.other = 'Bank 0';
                }
                break;
            }
            default:
                break;
        }
    },

    afterScore(boon, gameState, result, engine) {
        if (this.isDisabled(boon, gameState)) return;

        if (boon.id === 'lethe_waters') {
            let stripped = 0;
            (gameState.dice || []).forEach((die) => {
                const face = die.currentFace ?? die.face;
                const rec = die.faces?.[face];
                if (!rec?.enhancements || rec.enhancements.size === 0) return;
                stripped += rec.enhancements.size;
                rec.enhancements.clear();
            });
            if (stripped > 0) {
                boon.letheFavour = (boon.letheFavour || 0) + stripped * this.FAVOUR_PER_TENTH;
                boon.dynamicStats = boon.dynamicStats || {};
                boon.dynamicStats.favour = boon.letheFavour;
                engine?.showMessage?.(
                    `Forgetfulness: drank ${stripped} blessing${stripped === 1 ? '' : 's'} (+${(stripped * 0.1).toFixed(1)} Favour)`,
                    3000,
                );
            }
        }
    },

    anteEnd(boon, gameState, engine) {
        if (boon.id === 'cornucopia_of_ploutos') {
            const g = gameState.gold || 0;
            if (g < 10) {
                const delta = 10 - g;
                if (engine && typeof engine.updateGoldAnimated === 'function') {
                    engine.updateGoldAnimated(delta, 'Ploutos');
                } else {
                    gameState.gold = 10;
                }
                engine?.showMessage?.(`Ploutos: Gold ${g} → 10.`, 3500);
            }
            return;
        }

        if (boon.id === 'the_odyssey') {
            /* nostos pays on last fill, not ante end */
        }
    },

    /** Call from toggleHold after held flips. */
    onHoldToggle(gameState, index, nowHeld) {
        if (!(gameState.boons || []).some((j) => j.id === 'cerberus_watch')) return;
        if (gameState.cerberusBroken) return;
        if (!Array.isArray(gameState.cerberusWatched)) gameState.cerberusWatched = [];

        if (nowHeld) {
            if (gameState.cerberusWatched.length < 3 && !gameState.cerberusWatched.includes(index)) {
                gameState.cerberusWatched.push(index);
            }
        } else if (gameState.cerberusWatched.includes(index)) {
            gameState.cerberusBroken = true;
        }
    },

    /** Medusa: cannot unhold a stone 6. */
    denyUnhold(gameState, index) {
        if (!(gameState.boons || []).some((j) => j.id === 'medusas_gaze')) return null;
        const die = gameState.dice?.[index];
        if (!die) return null;
        if (this.faceOf(die) !== 6) return null;
        if (!gameState.held?.[index]) return null; // allowing hold
        return "Medusa's Gaze: the six is stone.";
    },

    /**
     * After a category is cashed (finalizeScoring).
     * @param {boolean} wasUnfilled — category was empty before this score
     * @param {number} unfilledAfter — unfilled count after apply
     */
    onCategoryScored(gameState, category, { isValid, wasUnfilled, unfilledAfter }, engine) {
        if (!isValid) {
            gameState.scratchesThisTrial = (gameState.scratchesThisTrial || 0) + 1;
        }

        if (category === 'Eights') {
            gameState.odysseusDisabled = true;
        }

        const odyssey = (gameState.boons || []).find((j) => j.id === 'the_odyssey');
        if (!odyssey || this.isDisabled(odyssey, gameState)) return;
        if (!isValid || !wasUnfilled) return;
        if (unfilledAfter !== 0) return;

        const scratches = gameState.scratchesThisTrial || 0;
        const bonus = scratches * 5;
        if (bonus <= 0) {
            engine?.showMessage?.('Wanderings of Odysseus: the last shore — but no wrecks to claim.', 3000);
            return;
        }
        gameState.tempPips = (gameState.tempPips || 0) + bonus;
        // Prefer immediate score bump if still in finalize — use totalScore add
        gameState.totalScore = (gameState.totalScore || 0) + bonus;
        engine?.showMessage?.(
            `Wanderings of Odysseus: +${bonus} Pips (${scratches} scratch${scratches === 1 ? '' : 'es'})!`,
            4000,
        );
        if (typeof Logger !== 'undefined') Logger.info(`Odysseus nostos +${bonus}`);
    },

    /** Trial / ante start reset for Odysseus Poseidon flag. */
    onTrialStart(gameState) {
        gameState.odysseusDisabled = false;
        gameState.scratchesThisTrial = 0;
    },

    /** Fire after_roll on all boons (from GameEngine.executeRoll). */
    fireAfterRoll(engine, meta) {
        (engine.state.boons || []).forEach((boon) => {
            if (boon.timing?.after_roll && typeof boon.onTimingEvent === 'function') {
                boon.onTimingEvent('after_roll', engine.state, meta, engine);
            }
        });
    },

    dicePreview(boonId, state, getFace) {
        if (!state?.dice) return [];
        const result = [];
        const held = state.held || [];
        const faceOf = getFace || ((d) => this.faceOf(d));

        switch (boonId) {
            case 'cerberus_watch': {
                const watched = state.cerberusWatched || [];
                if (!state.cerberusBroken && watched.length === 3) {
                    watched.forEach((i) => result.push({ dieIndex: i, label: '+3 gate' }));
                }
                break;
            }
            case 'prime_time': {
                const primes = [2, 3, 5];
                if (state.unlockedCategories?.Sevens) primes.push(7);
                state.dice.forEach((d, i) => {
                    if (primes.includes(faceOf(d))) result.push({ dieIndex: i, label: '+0.3 favour' });
                });
                break;
            }
            case 'the_locksmith':
                state.dice.forEach((die, i) => {
                    const heldRolls = die.rollsHeld || 0;
                    if (heldRolls > 0) result.push({ dieIndex: i, label: `+${heldRolls} pips` });
                });
                break;
            case 'medusas_gaze':
                state.dice.forEach((d, i) => {
                    if (faceOf(d) === 6) result.push({ dieIndex: i, label: '+6 pips' });
                });
                break;
            default:
                break;
        }
        return result;
    },

    /** Horse: Favour ×2 from Turn 10 (once in ScoringEngine). */
    syncHorseFavourMultiplier(gameState) {
        const has = (gameState.boons || []).some((j) => j.id === 'trojan_horse');
        const active = has && (gameState.turn || 0) >= 10;
        gameState.favourMultiplier = active ? 2 : 1;
        gameState.boonMultiplier = 1; // no longer ×2 all effects
        return active;
    },
};

if (typeof window !== 'undefined') window.NearMissBoonHandlers = NearMissBoonHandlers;
