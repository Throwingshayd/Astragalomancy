/* global GAME_BALANCE, BOON_EFFECTS, Logger, CATEGORY_TO_NUMBER, GodUtils */
/* exported BoonTimingHandlers */

/**
 * before_score effects (extracted from Boon.js). Mutates the score result object in place.
 * Load before Boon.js — see game/index.html.
 */
const BoonTimingHandlers = {
    /** @param {Object|null} game - Explicit engine reference from Boon.applyBeforeScoreEffect; falls back to the global engine singleton when omitted */
    runBeforeScore(boon, gameState, result, game = null) {
        const engine = game || window.game;
        switch (boon.id) {

            case 'sisyphus_boulder':
                // +5 Pips for every time you've rerolled this turn
                const totalRerolls = (GAME_BALANCE.STARTING_ROLLS - gameState.rollsLeft);
                const boulderBonus = totalRerolls * BOON_EFFECTS.SISYPHUS_BOULDER.PIPS_PER_REROLL;
                result.pips += boulderBonus;
                boon.dynamicStats.pips = boulderBonus;
                if (boulderBonus > 0) {
                    engine?.showMessage?.(`Sisyphus' Boulder: +${boulderBonus} Pips!`);
                }
                break;
            
            
            case 'pandoras_jar':
                // Apply permanent stacks (gained once per interval in turn_start — not here)
                if (boon.pandoraFavourStacks > 0) {
                    result.favour += boon.pandoraFavourStacks;
                    boon.dynamicStats.favour = boon.pandoraFavourStacks;
                }
                break;
            
            // === CORE BOONS - Previously Missing ===
            case 'achilles_heel':
                // +15 Pips (in addition to -1 gold penalty in turn_start)
                result.pips += 15;
                engine?.showMessage?.("Achilles' Heel: +15 Pips!");
                break;
            
            case 'midas_touch': {
                // Hoard payoff: gold empowers the offering (Favour, so it scales). +0.1 per 5g.
                const midasFavour = Math.floor((gameState.gold || 0) / 5) * 10;
                if (midasFavour > 0) {
                    result.favour += midasFavour;
                    boon.dynamicStats.favour = midasFavour;
                    engine?.showMessage?.(`Midas Touch: +${midasFavour / 100} Favour from ${gameState.gold} gold!`);
                }
                break;
            }
            
            case 'lethe_waters':
                // +25 Pips flat bonus (ignoring 1-2s is cosmetic/handled elsewhere)
                result.pips += 25;
                engine?.showMessage?.("Lethe Waters: +25 Pips!");
                break;
            
            case 'icarus_wings':
                // +10 Pips per unused roll (in addition to break chance in turn_end)
                const unusedRolls = gameState.rollsLeft;
                const icarusBonus = unusedRolls * 10;
                if (icarusBonus > 0) {
                    result.pips += icarusBonus;
                    boon.dynamicStats.pips = icarusBonus;
                    engine?.showMessage?.(`Icarus' Wings: +${icarusBonus} Pips from ${unusedRolls} unused rolls!`);
                }
                break;

            case 'the_gambler':
                // +10 Pips for every re-roll remaining
                const gamblerRollsLeft = gameState.rollsLeft ?? 0;
                const gamblerBonus = gamblerRollsLeft * 10;
                if (gamblerBonus > 0) {
                    result.pips += gamblerBonus;
                    boon.dynamicStats.pips = gamblerBonus;
                    engine?.showMessage?.(`The Gambler: +${gamblerBonus} Pips from ${gamblerRollsLeft} rerolls left!`);
                }
                break;
            
            case 'hestias_hearth':
                // +300 Favour if all dice are odd OR all dice are even
                const allOdd = gameState.dice.every(die => die.getEffectiveFace() % 2 === 1);
                const allEven = gameState.dice.every(die => die.getEffectiveFace() % 2 === 0);
                
                if (allOdd || allEven) {
                    result.favour += 300;
                    boon.dynamicStats.favour = 300;
                    engine?.showMessage?.(`Hestia's Hearth: +3 Favour (all ${allOdd ? 'odd' : 'even'})!`);
                }
                break;
            
            case 'prometheus_gift':
                // +3 Favour all hands (in addition to -1 roll penalty in turn_start)
                result.favour += 300;
                engine?.showMessage?.("Prometheus' Gift: +3 Favour!");
                break;
            
            case 'forge_of_hephaestus':
                // +50 Favour per unused roll (max +150)
                const forgeUnusedRolls = gameState.rollsLeft;
                const forgeFavour = Math.min(forgeUnusedRolls * 50, 150);
                if (forgeFavour > 0) {
                    result.favour += forgeFavour;
                    boon.dynamicStats.favour = forgeFavour;
                    engine?.showMessage?.(`Forge of Hephaestus: +${typeof NumberFormat !== 'undefined' ? NumberFormat.favourContrib(forgeFavour) : forgeFavour / 100} Favour from ${forgeUnusedRolls} unused rolls!`);
                }
                break;
            
            case 'mt_olympus':
                // +100 Favour for each Worship card used this run (sum of worship levels)
                const worshipUsed = Object.values(gameState.worshipLevels || {}).reduce((sum, level) => sum + level, 0);
                if (worshipUsed > 0) {
                    result.favour += worshipUsed * 100;
                    boon.dynamicStats.favour = worshipUsed * 100;
                    engine?.showMessage?.(`Mt Olympus: +${typeof NumberFormat !== 'undefined' ? NumberFormat.favourContrib(worshipUsed * 100) : worshipUsed} Favour from worship levels!`);
                }
                break;
            
            case 'chaos_primordial':
                // Doubles all Favour gains (applied by multiplying final favour before score calculation)
                // This acts like a permanent ×2 on the favour component
                // Since favour is already calculated, we add the current favour again (doubling it)
                const currentFavour = result.favour || 0;
                result.favour += currentFavour; // Effectively doubles it
                if (currentFavour > 0) {
                    engine?.showMessage?.(`Chaos Primordial: Favour doubled!`);
                }
                break;
            
            // === NEW BOONS - Vibrant Tier ===
            case 'hydras_heads':
                // Whenever you score with exactly 2 pairs (e.g. 2-2-3-3-5 or 2-2-2-3-3), gain +300 Favour
                const counts = {};
                (gameState.dice || []).forEach(d => {
                    const f = typeof d.getEffectiveFace === 'function' ? d.getEffectiveFace() : (d.face || d.currentFace);
                    if (f > 0) counts[f] = (counts[f] || 0) + 1;
                });
                const pairCount = Object.values(counts).filter(c => c >= 2).length;
                if (pairCount === 2) {
                    result.favour += 300;
                    engine?.showMessage?.("Hydra's Heads: +3 Favour for two pairs!");
                }
                break;
            
            case 'medusas_gaze':
                // Lower sanctum scores give +50 Favour
                const lowerSanctum = ['Three of a Kind', 'Four of a Kind', 'Full House', 
                                     'Small Straight', 'Large Straight', 'Yahtzee', 'Chance'];
                if (lowerSanctum.includes(result.category)) {
                    result.favour += 50;
                    engine?.showMessage?.("Medusa's Gaze: +0.5 Favour (lower sanctum)!");
                }
                break;
            
            case 'tantalus_curse':
                // +10 Favour for each gold, but cannot spend gold
                const tantalusFavour = (gameState.gold || 0) * 10;
                result.favour += tantalusFavour;
                boon.dynamicStats.favour = tantalusFavour;
                if (tantalusFavour > 0) {
                    engine?.showMessage?.(`Tantalus' Curse: +${typeof NumberFormat !== 'undefined' ? NumberFormat.favourContrib(tantalusFavour) : tantalusFavour / 100} Favour from gold!`);
                }
                // Gold blocking handled in shop
                break;
            
            case 'pegasus_flight': {
                // Dice with values 6+ give +50 Favour each when scored (only dice IN the score count)
                const category = result.category;
                const num = typeof CATEGORY_TO_NUMBER !== 'undefined' ? CATEGORY_TO_NUMBER[category] : null;
                let highDiceInScore = 0;
                const pegasusDieIndices = [];
                (gameState.dice || []).forEach((d, i) => {
                    const face = typeof d.getEffectiveFace === 'function' ? d.getEffectiveFace() : (d.face ?? d.currentFace ?? 0);
                    const inScore = num != null ? (face === num) : (face > 0);
                    if (inScore && face >= 6) {
                        highDiceInScore++;
                        pegasusDieIndices.push(i);
                    }
                });
                if (highDiceInScore > 0) {
                    const favourBonus = highDiceInScore * 50;
                    result.favour += favourBonus;
                    result._pegasusDieIndices = pegasusDieIndices; // For scoring animation popups
                    engine?.showMessage?.(`Pegasus' Flight: +${typeof NumberFormat !== 'undefined' ? NumberFormat.favourContrib(favourBonus) : favourBonus / 100} Favour from ${highDiceInScore} high dice!`);
                }
                break;
            }
            
            case 'cerberus_watch': {
                // The first 3 dice you hold each turn gain +3 Pips each
                const cerberusDieIndices = [];
                (gameState.dice || []).forEach((d, i) => {
                    if (d.held && cerberusDieIndices.length < 3) cerberusDieIndices.push(i);
                });
                const cerberusBonus = cerberusDieIndices.length * 3;
                result.pips += cerberusBonus;
                if (cerberusBonus > 0) {
                    result._cerberusDieIndices = cerberusDieIndices;
                    engine?.showMessage?.(`Cerberus' Watch: +${cerberusBonus} Pips for held dice!`);
                }
                break;
            }
            
            case 'apollos_oracle':
                // Apollo's Oracle: reduce score by 20%
                result.pips = Math.floor(result.pips * 0.8);
                engine?.showMessage?.("Apollo's Oracle: -20% score penalty!");
                break;
            
            case 'trojan_horse':
                // After Turn 10, all Boons give ×2 effect (handled by global multiplier in applyTimingEffect)
                // Show big activation message at turn 11
                if (gameState.turn === 11) {
                    engine?.showMessage?.("🐴 THE TROJAN HORSE ACTIVATES! All boons now ×2!", 5000);
                    Logger.info("Trojan Horse activated at turn 11 - all boons now doubled!");
                }
                break;
            
            // === NEW BOONS - Rustic Tier ===
            case 'lucky_dice_bag':
                // Reroll 1s automatically (handled in after_roll)
                break;
            
            case 'gamblers_charm':
                // 50% chance +2 Gold (handled in after_score)
                break;
            
            case 'marathon_runner':
                // Gain +1 Pips per roll taken (stacks, destroyed at 42+ or scratch)
                const marathonPips = boon.marathonPips || 0;
                
                if (marathonPips > 0) {
                    result.pips += marathonPips;
                    boon.dynamicStats.pips = marathonPips;
                    engine?.showMessage?.(`Marathon Runner: +${marathonPips} Pips!`);
                }
                break;
            
            case 'golden_touch':
                // Better interest rate (handled in shop/economy)
                break;
            
            // === NEW BOONS - Wave 2 ===
            case 'mathematicians_compass':
                // Straights (consecutive sequences) get Favour — rewards the build, not sum-hacking.
                if (result.category === 'Small Straight' || result.category === 'Large Straight') {
                    result.favour += 200;
                    boon.dynamicStats.favour = 200;
                    engine?.showMessage?.("Mathematician's Compass: straight, +2 Favour!");
                }
                break;
            
            case 'prime_time': {
                // Primes are half the faces, so this rewards normal rolls, not a face-chase.
                const primes = [2, 3, 5];
                if (gameState.unlockedCategories?.Sevens) primes.push(7);
                const primeCount = gameState.dice.filter(die => primes.includes(die.face)).length;
                if (primeCount > 0) {
                    const primeFavour = primeCount * 30;
                    result.favour += primeFavour;
                    boon.dynamicStats.favour = primeFavour;
                    engine?.showMessage?.(`Prime Time: +${primeFavour / 100} Favour from ${primeCount} primes!`);
                }
                break;
            }
            
            case 'the_locksmith':
                // Held dice gain +1 pips for each roll they were held
                let locksmithBonus = 0;
                
                gameState.dice.forEach(die => {
                    if (die.rollsHeld) {
                        locksmithBonus += die.rollsHeld;
                    }
                });
                
                if (locksmithBonus > 0) {
                    result.pips += locksmithBonus;
                    boon.dynamicStats.pips = locksmithBonus;
                    engine?.showMessage?.(`The Locksmith: +${locksmithBonus} Pips from held rolls!`);
                }
                break;
            
            case 'the_heretic':
                // Gain stacking pips (resets on worship use or ante end)
                const hereticPips = gameState.hereticStacks || 0;
                if (hereticPips > 0) {
                    result.pips += hereticPips;
                    boon.dynamicStats.pips = hereticPips;
                    boon.dynamicStats.other = `🚫 No Worship`;
                    engine?.showMessage?.(`The Heretic: +${hereticPips} Pips (stacking)!`);
                } else {
                    boon.dynamicStats.pips = 0;
                    boon.dynamicStats.other = 'Reset';
                }
                break;
            
            case 'reckless_abandon': {
                // Commit fully: no dice held → ×2 Favour. Holding is allowed but forfeits it.
                const anyHeld = (gameState.held || []).some(Boolean) || (gameState.dice || []).some(d => d.held);
                if (!anyHeld) {
                    result.favour *= 2;
                    boon.dynamicStats.favour = '×2';
                    engine?.showMessage?.("Reckless Abandon: no dice held — ×2 Favour!");
                }
                break;
            }
            
            case 'typhon': {
                // Father of monsters: each 1 grants Favour, so all-1s is a reachable payoff.
                const ones = gameState.dice.filter(die => die.face === 1).length;
                if (ones > 0) {
                    const typhonFavour = ones * 50;
                    result.favour += typhonFavour;
                    boon.dynamicStats.favour = typhonFavour;
                    engine?.showMessage?.(`🌋 Typhon: ${ones}× 1 — +${typhonFavour / 100} Favour!`);
                }
                break;
            }
            
            case 'early_bird':
                // Turns 1-3: +20 Pips, turns 6-13: -5 Pips
                if (gameState.turn >= 1 && gameState.turn <= 3) {
                    result.pips += 20;
                    engine?.showMessage?.("🌅 Early Bird: +20 Pips! (Morning phase)");
                    boon.dynamicStats.other = '☀️ Morning';
                } else if (gameState.turn >= 6 && gameState.turn <= 13) {
                    result.pips -= 5;
                    engine?.showMessage?.("Early Bird: -5 Pips (late game penalty)");
                    boon.dynamicStats.other = '🌙 Evening';
                } else {
                    // Turns 4-5 (gold phase)
                    boon.dynamicStats.other = '💰 Midday';
                }
                break;
            
            case 'the_symposium':
                // Each 4 of a kind or greater gives +5 Favour (stacking)
                const symposiumFaceCounts = {};
                gameState.dice.forEach(die => {
                    symposiumFaceCounts[die.face] = (symposiumFaceCounts[die.face] || 0) + 1;
                });
                
                const hasFourOfKind = Object.values(symposiumFaceCounts).some(count => count >= 4);
                
                if (hasFourOfKind) {
                    // Stack favour on the boon itself
                    if (!boon.symposiumFavourStacks) {
                        boon.symposiumFavourStacks = 0;
                    }
                    boon.symposiumFavourStacks += 5;
                    result.favour += boon.symposiumFavourStacks;
                    boon.dynamicStats.favour = boon.symposiumFavourStacks;
                    const s = boon.symposiumFavourStacks;
                    engine?.showMessage?.(`The Symposium: +${typeof NumberFormat !== 'undefined' ? NumberFormat.favourContrib(s) : s / 100} Favour!`);
                } else if (boon.symposiumFavourStacks > 0) {
                    // Still apply accumulated stacks even if not triggering this turn
                    result.favour += boon.symposiumFavourStacks;
                    boon.dynamicStats.favour = boon.symposiumFavourStacks;
                }
                break;
            
            case 'assembly_of_heroes':
                // If all boon slots are full, gain +15 Pips
                const maxBoonSlots = gameState.boonSlots || GAME_BALANCE.STARTING_BOON_SLOTS;
                const currentBoons = gameState.boons?.length || 0;
                
                if (currentBoons >= maxBoonSlots) {
                    result.pips += 15;
                    engine?.showMessage?.(`Assembly of Heroes: +15 Pips (slots full!)!`);
                }
                break;
            
            case 'divine_synergy':
                // Boons of same rarity amplify each other (+5 Pips per match)
                const rarityCounts = {};
                gameState.boons.forEach(boon => {
                    rarityCounts[boon.rarity] = (rarityCounts[boon.rarity] || 0) + 1;
                });
                
                let synergyBonus = 0;
                Object.values(rarityCounts).forEach(count => {
                    if (count >= 2) {
                        synergyBonus += (count - 1) * 5; // Each match beyond first gives +5
                    }
                });
                
                if (synergyBonus > 0) {
                    result.pips += synergyBonus;
                    boon.dynamicStats.pips = synergyBonus;
                    engine?.showMessage?.(`Divine Synergy: +${synergyBonus} Pips!`);
                }
                break;
            
            case 'first_blood':
                // First score each ante gives +50 Pips
                const categoriesScored = Object.keys(gameState.scorecard).length;
                
                if (categoriesScored === 0) {
                    result.pips += BOON_EFFECTS.FIRST_BLOOD.FIRST_SCORE_BONUS;
                    engine?.showMessage?.("⚔️ First Blood: +50 Pips! (First score of Trial)", 3000);
                    boon.dynamicStats.other = '✓ USED';
                } else {
                    boon.dynamicStats.other = '✗ Next Trial';
                }
                break;
            
            case 'midnight_oil':
                // Turn 12+ gives +24 Pips
                if (gameState.turn >= BOON_EFFECTS.MIDNIGHT_OIL.LATE_GAME_TURN) {
                    result.pips += BOON_EFFECTS.MIDNIGHT_OIL.PIPS_BONUS;
                    engine?.showMessage?.("🕯️ Midnight Oil: +24 Pips! (Late game boost)", 2500);
                    boon.dynamicStats.other = '✓ ACTIVE';
                } else {
                    boon.dynamicStats.other = `T${BOON_EFFECTS.MIDNIGHT_OIL.LATE_GAME_TURN - gameState.turn}`;
                }
                break;
            
            case 'doubling_season':
                // Even-valued dice get +2 pips, odd-valued dice (except 1) get -1 pip
                // Only applies to dice that contribute to the score
                let seasonAdjustment = 0;
                const categoryNum = CATEGORY_TO_NUMBER[result.category];
                
                gameState.dice.forEach(die => {
                    const dieValue = die.getEffectiveFace();
                    
                    // For number categories (Ones through Nines), only count matching dice
                    if (categoryNum && dieValue !== categoryNum) {
                        return; // Skip dice that don't contribute to this category
                    }
                    
                    // For combination categories (3oK, 4oK, etc.), count all dice
                    // Apply bonus based on die value
                    if (dieValue % 2 === 0) {
                        // Even: +2 pips per die
                        seasonAdjustment += 2;
                    } else if (dieValue > 1) {
                        // Odd (except 1): -1 pip
                        seasonAdjustment -= 1;
                    }
                    // 1 stays as is (no adjustment)
                });
                
                if (seasonAdjustment !== 0) {
                    result.pips += seasonAdjustment;
                    engine?.showMessage?.(`Doubling Season: ${seasonAdjustment > 0 ? '+' : ''}${seasonAdjustment} Pips!`);
                }
                boon.dynamicStats.pips = seasonAdjustment;
                break;
            
            case 'symmetry':
                // Apply accumulated favour from palindromes
                if (boon.symmetryFavour > 0) {
                    result.favour += boon.symmetryFavour;
                    boon.dynamicStats.favour = boon.symmetryFavour;
                }
                break;
            
            case 'misery':
                // If you have 0 gold, gain +200 Favour
                if (gameState.gold === 0) {
                    result.favour += 200;
                    engine?.showMessage?.("Misery: +2 Favour (broke!)");
                }
                break;
            
            case 'the_zealot':
                // Give +1 favour if scoring matches last worship god's category
                if (gameState.lastWorshipGod && typeof GodUtils !== 'undefined') {
                    const zealotCategory = GodUtils.getCategory(gameState.lastWorshipGod);
                    
                    if (result.category === zealotCategory) {
                        result.favour += 100;
                        engine?.showMessage?.(`The Zealot: +1 Favour (${gameState.lastWorshipGod})!`);
                    }
                }
                break;
            
            case 'eruption_of_etna':
                // If 3+ boons triggered this turn, +1 favour (cumulative, doesn't reset)
                const etnaTriggersThisTurn = gameState.boonTriggersThisTurn || 0;
                
                if (etnaTriggersThisTurn >= 3) {
                    if (!boon.etnaFavourStacks) {
                        boon.etnaFavourStacks = 0;
                    }
                    boon.etnaFavourStacks += 100;
                    engine?.showMessage?.(`🌋 Eruption of Etna: +1 Favour (${etnaTriggersThisTurn} boons triggered)!`, 3000);
                }
                
                // Apply accumulated favour
                if (boon.etnaFavourStacks > 0) {
                    result.favour += boon.etnaFavourStacks;
                    boon.dynamicStats.favour = boon.etnaFavourStacks;
                }
                
                // Always show trigger count for player feedback
                boon.dynamicStats.other = `🎴${etnaTriggersThisTurn}`;
                break;
            
            case 'ascetics_vow':
                // Gain +1 favour for each empty boon slot
                const asceticMaxSlots = gameState.boonSlots || GAME_BALANCE.STARTING_BOON_SLOTS;
                const asceticFilledSlots = gameState.boons?.length || 0;
                const asceticEmptySlots = asceticMaxSlots - asceticFilledSlots;
                
                if (asceticEmptySlots > 0) {
                    result.favour += asceticEmptySlots * 100;
                    boon.dynamicStats.favour = asceticEmptySlots * 100;
                    engine?.showMessage?.(`Ascetic's Vow: +${typeof NumberFormat !== 'undefined' ? NumberFormat.favourContrib(asceticEmptySlots * 100) : asceticEmptySlots} Favour (${asceticEmptySlots} empty)!`);
                }
                break;
            
            case 'nyxian_seduction':
                // Chance category: +69 Pips, seduce (reduce) random god's favour
                if (result.category === 'Chance') {
                    result.pips += 69;
                    
                    // Pick a random god to seduce (75% male preference)
                    const maleGods = ['Ares', 'Apollo', 'Zeus', 'Hermes', 'Heracles', 
                                     'Hephaestus', 'Dionysus', 'Morpheus'];
                    const femaleGods = ['Artemis', 'Aphrodite', 'Hera', 'Athena', 'Nyx'];
                    
                    // Add unlocked gods
                    if (gameState.unlockedCategories?.Eights) maleGods.push('Poseidon');
                    if (gameState.unlockedCategories?.Sevens) femaleGods.push('The Pleiades');
                    if (gameState.unlockedCategories?.Nines) femaleGods.push('The Nine Muses');
                    
                    // 75% male, 25% female - use seeded RNG
                    const targetPool = boon._getPrng()?.random() < 0.75 ? maleGods : femaleGods;
                    const seducedGod = targetPool[boon._randomInt(targetPool.length)];
                    
                    // Reduce their worship level
                    if (gameState.worshipLevels[seducedGod] > 0) {
                        gameState.worshipLevels[seducedGod] -= 1;
                        engine?.showMessage?.(`💋 Nyxian Seduction: +69 Pips, ${seducedGod} worship -1!`, 3000);
                    }
                }
                break;
            
            case 'gold_standard':
                // Threshold payoff: stay rich and every offering is amplified (×Favour).
                if ((gameState.gold || 0) >= 20) {
                    result.favour *= 1.5;
                    boon.dynamicStats.favour = '×1.5';
                    engine?.showMessage?.(`Gold Standard: ${gameState.gold} gold — ×1.5 Favour!`);
                }
                break;
            
            case 'carillon_of_the_muses':
                // If all 5 dice have enhancements, gain ×3 Favour (×5 if all same)
                let carillonEnhancedCount = 0;
                const carillonEnhancementTypes = new Set();
                
                gameState.dice.forEach(die => {
                    const currentFace = die.face;
                    if (die.faces[currentFace] && die.faces[currentFace].enhancements.size > 0) {
                        carillonEnhancedCount++;
                        // Track first enhancement type for each die
                        const firstEnhancement = Array.from(die.faces[currentFace].enhancements)[0].enhancement;
                        carillonEnhancementTypes.add(firstEnhancement);
                    }
                });
                
                if (carillonEnhancedCount === 5) {
                    if (carillonEnhancementTypes.size === 1) {
                        // SECRET BONUS: All same enhancement! (MULTIPLICATIVE!)
                        result.favour *= 2.5;
                        engine?.showMessage?.("🎵 Carillon of the Muses: PERFECT HARMONY! ×2.5 Favour!", 5000);
                        Logger.info("Carillon secret bonus triggered: All same enhancement - ×Favour!");
                    } else {
                        // All enhanced but different (ADDITIVE)
                        result.favour += 300;
                        engine?.showMessage?.("Carillon of the Muses: +3 Favour!");
                    }
                }
                break;
            
            case 'journey_of_perseus':
                // Gain +10 pips per 100 total score
                const perseusTotal = gameState.totalScore || 0;
                const perseusBonus = Math.floor(perseusTotal / 100) * 10;
                
                if (perseusBonus > 0) {
                    result.pips += perseusBonus;
                    boon.dynamicStats.pips = perseusBonus;
                    engine?.showMessage?.(`Journey of Perseus: +${perseusBonus} Pips!`);
                }
                break;

            default:
                // Unknown boon effect - log for debugging but don't break the game
                Logger.warn(`Unknown boon effect: ${boon.id} - this boon may not function correctly`);
                // Return unchanged result to prevent game-breaking
                break;
        }
    }
};

if (typeof window !== 'undefined') {
    window.BoonTimingHandlers = BoonTimingHandlers;
}
