/**
 * ScoringAnimation — Balatro-style sequential score reveal (dice, boons, pantheon).
 */

class ScoringAnimation {
    /** @param {GameEngine} engine */
    constructor(engine) {
        this.engine = engine;
    }

    playReveal(category, pips, favour, finalScore, targetCategory, callback) {
        const displayCategory = targetCategory || category;
        const row = document.querySelector(`[data-category="${displayCategory}"]`);
        const scoreDisplay = row?.querySelector('.potential-score');
        
        // SUSPENSEFUL CALCULATION IN GNOSIS!
        // Show the calculation with count-up animation, then place result in pantheon
        if (!this.engine.domReady || !this.engine.dom.liveScoreDisplay) {
            // Fallback if no Gnosis display
            if (scoreDisplay) scoreDisplay.innerHTML = finalScore;
            if (targetCategory && targetCategory !== category) {
                if (typeof DevotionUtils !== 'undefined') {
                    DevotionUtils.applyPantheonScore(this.engine.state, targetCategory, finalScore);
                    DevotionUtils.applyPantheonScore(this.engine.state, category, 0);
                } else {
                    this.engine.state.scorecard[targetCategory] = finalScore;
                    this.engine.state.scorecard[category] = 0;
                }
            } else if (typeof DevotionUtils !== 'undefined') {
                DevotionUtils.applyPantheonScore(this.engine.state, category, finalScore);
            } else {
                this.engine.state.scorecard[category] = finalScore;
            }
            this.engine.state.totalScore += finalScore;
            callback();
            return;
        }
        
        const el = this.engine.dom.liveScoreDisplay;
        
        // BALATRO-STYLE SEQUENTIAL SCORING:
        // 1. Dice jiggle and add pips one by one
        // 2. Boons jiggle and add bonuses
        // 3. Show final multiplication
        // 4. Count up to final score
        
        this.playSequential(category, pips, favour, finalScore, targetCategory, el, scoreDisplay, callback);
    }
    
    /**
     * BALATRO-STYLE SEQUENTIAL SCORING ANIMATION
     * Dice jiggle and add pips one by one, then boons trigger and add bonuses
     * @param {string} category - Scoring category
     * @param {number} pips - Final pips after all bonuses
     * @param {number} favour - Final favour after all bonuses
     * @param {number} finalScore - Final calculated score
     * @param {HTMLElement} liveScoreEl - Live score display element
     * @param {HTMLElement} scorecardEl - Scorecard cell element
     * @param {Function} callback - Called when complete
     */
    playSequential(category, pips, favour, finalScore, targetCategory, liveScoreEl, scorecardEl, callback) {
        this.engine.isScoring = true;
        const categoryLabel = this.engine.getLiveOfferingTitle(category, true);
        const god = this.engine.getGodForCategory(category);
        const basePips = this.calculateBasePips(category);
        const worshipLevel = god ? (this.engine.state.worshipLevels?.[god] || 0) : 0;
        const perLevel = typeof WORSHIP_FAVOUR_PER_LEVEL !== 'undefined' ? WORSHIP_FAVOUR_PER_LEVEL : 25;
        const categoryBaseFavour = (typeof BASE_FAVOUR !== 'undefined' ? BASE_FAVOUR : 100) + worshipLevel * perLevel;
        const diceContributions = this.getDiceContributions(category);
        const boonContributions = this.getBoonContributions(category, basePips, categoryBaseFavour);
        const up = (o) => this.engine.ensureLiveScore()?.updateValues(liveScoreEl, { ...o, category: categoryLabel, pipsLabel: 'pips', favourLabel: 'favour', showNa: false });

        // The offering's own pip floor (Three of a Kind = 15) is the number the
        // dice land on, so the row reads the same from hover through scoring.
        const categoryBasePips = this.getCategoryPipBase(category);
        let currentPips = categoryBasePips;
        let currentFavour = categoryBaseFavour;
        let delay = 0;
        // Each contribution slides in as a chip, holds, then lands on the running total.
        const landMs = () => this.engine.scaleDelay(130);
        const contribText = (n) => (window.NumberFormat ? window.NumberFormat.contrib(n) : String(n));

        // Start
        up({ pips: this.engine.formatDisplay(categoryBasePips), pipsAdd: false, favour: this.engine.formatFavour(categoryBaseFavour), favourAdd: false });
        liveScoreEl.classList.add('visible');

        // Step 1: Dice adding pips — stacked: base+iron+pearl combined per die; gold shown as +1G on die
        diceContributions.forEach((contrib) => {
            const beforePips = currentPips;
            currentPips += contrib.pips;
            const afterPips = currentPips;
            delay += this.engine.scaleDelay(180);
            const at = delay;
            setTimeout(() => {
                this.jiggleDie(contrib.dieIndex);
                this.showPipPopupOnDie(contrib.dieIndex, contrib.pips);
                if (contrib.gold) {
                    setTimeout(() => {
                        this.showGoldPopupOnDie(contrib.dieIndex, contrib.gold);
                        if (window.soundManager) window.soundManager.play('coin3', { pitch: 0.95, volume: 0.5 });
                    }, 120);
                }
                if (window.soundManager) window.soundManager.play('chips1', { pitch: 0.9 + this.engine.prng.random() * 0.15, volume: 0.45 });

                up({ pips: this.engine.formatDisplay(beforePips), pipsAdd: true, pipsContrib: contribText(contrib.pips), favour: this.engine.formatFavour(currentFavour), favourAdd: false });
            }, at);
            setTimeout(() => {
                up({ pips: this.engine.formatDisplay(afterPips), pipsAdd: false, pipsPulse: true, favour: this.engine.formatFavour(currentFavour), favourAdd: false });
            }, at + landMs());
        });

        // Step 2: Boons (pips/favour from boons) — accumulate
        delay += this.engine.scaleDelay(280);
        boonContributions.forEach((contrib) => {
            delay += this.engine.scaleDelay(180);
            const at = delay;
            setTimeout(() => {
                const beforePips = currentPips;
                const beforeFavour = currentFavour;
                if (contrib.pips > 0) currentPips += contrib.pips;
                if (contrib.favour > 0) currentFavour += contrib.favour;
                const afterPips = currentPips;
                const afterFavour = currentFavour;
                this.jiggleBoon(contrib.boonId);
                this.showBoonPopup(contrib.boonId, contrib);
                // Pegasus Flight: show ×0.5 favour popup only above dice that contributed (staggered)
                if (contrib.dieIndices?.length && contrib.favourLabel) {
                    contrib.dieIndices.forEach((di, idx) => {
                        setTimeout(() => {
                            this.showFavourPopupOnDie(di, contrib.favourLabel);
                            if (window.soundManager) window.soundManager.play('foil1', { pitch: 0.92 + idx * 0.02, volume: 0.4 });
                        }, idx * this.engine.scaleDelay(100));
                    });
                }
                // Cerberus Watch: show +3 pips on each held die (staggered like dice pips)
                if (contrib.dieIndices?.length && contrib.pipsLabel) {
                    contrib.dieIndices.forEach((di, idx) => {
                        setTimeout(() => {
                            this.showPipPopupOnDie(di, 3, '');
                            if (window.soundManager) window.soundManager.play('chips1', { pitch: 0.9 + idx * 0.03, volume: 0.4 });
                        }, idx * this.engine.scaleDelay(100));
                    });
                }
                // Pip boon: satisfying stamp; mult boon: sparkly foil
                if (window.soundManager) {
                    if (contrib.pips > 0 && contrib.favour > 0) {
                        window.soundManager.play('paper1', { pitch: 0.92 + this.engine.prng.random() * 0.1, volume: 0.5 });
                        window.soundManager.play('foil1', { pitch: 0.95 + this.engine.prng.random() * 0.1, volume: 0.45 });
                    } else if (contrib.pips > 0) {
                        window.soundManager.play('paper1', { pitch: 0.9 + this.engine.prng.random() * 0.15, volume: 0.55 });
                    } else if (contrib.favour > 0) {
                        window.soundManager.play('foil1', { pitch: 0.92 + this.engine.prng.random() * 0.12, volume: 0.5 });
                    }
                }

                up({
                    pips: this.engine.formatDisplay(beforePips),
                    pipsAdd: contrib.pips > 0,
                    pipsContrib: contrib.pips > 0 ? contribText(contrib.pips) : '',
                    favour: this.engine.formatFavour(beforeFavour),
                    favourAdd: contrib.favour > 0,
                    favourContrib: contrib.favour > 0 ? this.engine.formatFavourContrib(contrib.favour) : '',
                });
                setTimeout(() => {
                    up({
                        pips: this.engine.formatDisplay(afterPips),
                        pipsAdd: false,
                        pipsPulse: contrib.pips > 0,
                        favour: this.engine.formatFavour(afterFavour),
                        favourAdd: false,
                        favourPulse: contrib.favour > 0,
                    });
                }, landMs());
            }, at);
        });

        // Step 3: lock final pips/favour values, then resolve score into Pantheon
        delay += this.engine.scaleDelay(350);
        setTimeout(() => {
            up({ pips: this.engine.formatDisplay(pips), pipsAdd: false, favour: this.engine.formatFavour(favour), favourAdd: false });
            // Settle in place — glow, never displace the digits.
            const lockRow = liveScoreEl.querySelector('[data-live="row"]');
            if (lockRow) {
                lockRow.classList.add('is-locking');
                setTimeout(() => lockRow.classList.remove('is-locking'), this.engine.scaleDelay(460));
            }
            setTimeout(() => {
                // Step 4: Update game state (Parmenides: store in target, mark source used)
                const storeCategory = targetCategory || category;
                if (storeCategory !== category) {
                    if (typeof DevotionUtils !== 'undefined') {
                        DevotionUtils.applyPantheonScore(this.engine.state, storeCategory, finalScore);
                        DevotionUtils.applyPantheonScore(this.engine.state, category, 0);
                    } else {
                        this.engine.state.scorecard[storeCategory] = finalScore;
                        this.engine.state.scorecard[category] = 0;
                    }
                } else if (typeof DevotionUtils !== 'undefined') {
                    DevotionUtils.applyPantheonScore(this.engine.state, category, finalScore);
                } else {
                    this.engine.state.scorecard[category] = finalScore;
                }
                this.engine.state.totalScore += finalScore;
                this.engine.lastScoredBreakdown = { category, pips, favour, finalScore };

                // Balatro SFX: score placed — gold_seal for satisfying stamp/completion
                if (window.soundManager) {
                    window.soundManager.play('gold_seal', { pitch: 0.95 + this.engine.prng.random() * 0.1, volume: 0.7 });
                }
                // Particles only for big scores; screen shake only for rolling Eurekas (see executeRoll)
                if (finalScore >= 200 && window.balatroEffects && scorecardEl) {
                    this.createScoreParticles(scorecardEl, finalScore);
                }

                // Defer updateAllUI + isScoring=false until count-up ends (same DOM as ScorecardRenderer).
                setTimeout(() => {
                    const afterResolve = () => {
                        this.engine.isScoring = false;
                        setTimeout(() => {
                            this.engine.ensureLiveScore()?.updateDisplay(null);
                        }, this.engine.scaleDelay(2500));
                        this.engine.updateAllUI();
                        callback();
                    };
                    if (scorecardEl) {
                        const chipRow = scorecardEl.closest('.score-row');
                        if (chipRow) {
                            chipRow.classList.add('used', 'pantheon-scored');
                        }
                        this.engine.animateNumberCount(scorecardEl, 0, finalScore, this.engine.scaleDelay(650), afterResolve);
                        scorecardEl.classList.add('score-flash');
                        setTimeout(() => {
                            scorecardEl.classList.remove('score-flash');
                        }, this.engine.scaleDelay(400));
                    } else {
                        afterResolve();
                    }
                }, this.engine.scaleDelay(140));
                // Hands off while the settle glow is still up, so the tally and the
                // tablet read as one motion rather than two waits.
            }, this.engine.scaleDelay(320));
        }, delay);
    }

    /**
     * The offering's own pip floor before any dice land — Three of a Kind's 15,
     * plus whatever worship levels have added to it.
     * @param {string} category
     * @returns {number}
     */
    getCategoryPipBase(category) {
        if (typeof GnosisDisplay !== 'undefined') {
            const { counts } = GnosisDisplay.getFacesAndCounts(this.engine.state);
            return GnosisDisplay.getCategoryPipBonus(category, this.engine.state, counts);
        }
        return (typeof LOWER_SECTION_BONUSES !== 'undefined' && LOWER_SECTION_BONUSES[category]) || 0;
    }

    calculateBasePips(category) {
        const faces = this.engine.state.dice.map(die => die.getEffectiveFace());
        const counts = {};
        faces.forEach(face => {
            if (face > 0) counts[face] = (counts[face] || 0) + 1;
        });
        
        // Simple calculation for upper sanctum
        if (["Ones", "Twos", "Threes", "Fours", "Fives", "Sixes", "Sevens", "Eights", "Nines"].includes(category)) {
            const num = CATEGORY_TO_NUMBER[category];
            return (counts[num] || 0) * num;
        }
        
        // Lower sanctum returns sum of all dice
        return faces.reduce((a, b) => a + b, 0);
    }
    
    /**
     * Get individual dice contributions to score
     * Combines base pips + iron + pearl into one total per die (stacked like dice pips)
     * @param {string} category - Scoring category
     * @returns {Array} Array of {pips, dieIndex, source, gold?} objects
     */
    getDiceContributions(category) {
        const contributions = [];
        this.engine.state.dice.forEach((die, index) => {
            const preview = DieScoreContribution.preview(die, category);
            if (preview.pips > 0 || preview.gold) {
                const contrib = { pips: preview.pips, dieIndex: index, source: 'die' };
                if (preview.gold) contrib.gold = preview.gold;
                contributions.push(contrib);
            }
        });
        return contributions;
    }
    
    /**
     * Get boon contributions to score
     * Calculates what each boon added, plus enhancement favour bonuses
     * @param {string} category - Scoring category
     * @param {number} basePips - Pips before boons
     * @param {number} baseFavour - Favour before boons
     * @returns {Array} Array of {boonId, boonName, pips, favour, source} objects
     */
    getBoonContributions(category, basePips, baseFavour) {
        const contributions = [];
        
        // Add parchment Favour from the score we already resolved (do not roll again)
        const parchmentFortunes = this.engine.lastParchmentFortunes || [];
        parchmentFortunes.forEach((f) => {
            if (!f.favour) return;
            contributions.push({
                boonId: `parchment_${f.dieIndex}`,
                boonName: 'Parchment',
                pips: 0,
                favour: f.favour,
                source: 'enhancement',
                dieIndex: f.dieIndex,
                dieIndices: [f.dieIndex],
                favourLabel: '+1 Favour',
            });
        });
        
        // Simulate scoring with each boon individually to see contribution
        this.engine.state.boons.forEach(boon => {
            if (!boon.timing.before_score) return;
            
            // Test what this boon adds
            const testData = { category, pips: basePips, favour: baseFavour };
            const resultData = boon.onTimingEvent('before_score', this.engine.state, testData, this.engine);
            
            const pipsAdded = (resultData.pips || 0) - basePips;
            const favourAdded = (resultData.favour || 0) - baseFavour;
            
            if (pipsAdded !== 0 || favourAdded !== 0) {
                const contrib = {
                    boonId: boon.id,
                    boonName: boon.name,
                    pips: pipsAdded,
                    favour: favourAdded,
                    source: 'boon'
                };
                // Pegasus Flight: +0.5 Favour popup on dice that contributed
                if (boon.id === 'pegasus_flight' && resultData._pegasusDieIndices?.length) {
                    contrib.dieIndices = resultData._pegasusDieIndices;
                    contrib.favourLabel = '+0.5 Favour';
                }
                if (boon.id === 'carillon_of_the_muses' && baseFavour > 0
                    && Math.abs((resultData.favour / baseFavour) - 2.5) < 0.01) {
                    contrib.favourLabel = '×2.5 Favour';
                }
                // Cerberus Watch: show +3 pips on each held die
                if (boon.id === 'cerberus_watch' && resultData._cerberusDieIndices?.length) {
                    contrib.dieIndices = resultData._cerberusDieIndices;
                    contrib.pipsLabel = '+3 pips';
                }
                contributions.push(contrib);
            }
        });
        
        return contributions;
    }

    jiggleDie(dieIndex) {
        const dieElements = document.querySelectorAll('.die');
        const dieElement = dieElements[dieIndex];
        
        // Jiggle any die that contributed to the score (held or not)
        if (dieElement) {
            dieElement.classList.add('die-scoring-jiggle');
            setTimeout(() => {
                dieElement.classList.remove('die-scoring-jiggle');
            }, 400);
        }
    }
    
    /**
     * Show pip number popup over a die (Balatro-style chips on cards → pips on dice)
     * @param {number} dieIndex - Index of die
     * @param {number} pips - Pip value to display
     * @param {string} [label] - Optional label (e.g. 'Clockwork', 'Pearl')
     */
    showPipPopupOnDie(dieIndex, pips, label = '') {
        const text = label ? `${label}+${pips}` : `+${pips}`;
        this.showDiePopup(dieIndex, text, 'die-pip-popup');
    }
    
    /**
     * Show favour bonus popup over a die (e.g. Pegasus Flight ×0.5 favour)
     * @param {number} dieIndex - Index of die
     * @param {string} label - Label to show (e.g. '×0.5 favour')
     */
    showFavourPopupOnDie(dieIndex, label) {
        this.showDiePopup(dieIndex, label, 'die-pip-popup boon-dice-favour');
    }
    
    /**
     * Show gold popup over a die when gold enhancement triggers on score
     * @param {number} dieIndex - Index of die
     * @param {number} gold - Gold amount (e.g. 1)
     */
    showGoldPopupOnDie(dieIndex, gold) {
        this.showDiePopup(dieIndex, `+${gold}G`, 'die-pip-popup die-gold-popup', -24, '#FFD700');
    }

    showDiePopup(dieIndex, text, className, yOffset = -8, color = '') {
        const dieElements = document.querySelectorAll('.die');
        const dieElement = dieElements[dieIndex];
        if (!dieElement) return;

        const rect = dieElement.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.className = className;
        popup.textContent = text;
        popup.style.position = 'fixed';
        popup.style.left = `${rect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top + yOffset}px`;
        popup.style.transform = 'translate(-50%, 0)';
        popup.style.zIndex = '10000';
        popup.style.pointerEvents = 'none';
        if (color) popup.style.color = color;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 900);
    }
    
    /**
     * Jiggle a boon card with animation
     * @param {string} boonId - ID of boon to jiggle
     */
    jiggleBoon(boonId) {
        // Find boon card in the collection area
        const boonCards = document.querySelectorAll('.card');
        boonCards.forEach(card => {
            const cardData = card.dataset;
            if (cardData.id === boonId || card.querySelector(`[data-id="${boonId}"]`)) {
                card.classList.add('boon-trigger-jiggle');
                
                // Add glow effect
                card.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                
                setTimeout(() => {
                    card.classList.remove('boon-trigger-jiggle');
                    card.style.boxShadow = '';
                }, 600);
            }
        });
    }

    /**
     * Show contribution popup under a boon card
     * @param {string} boonId - ID of boon
     * @param {{pips: number, favour: number, boonName?: string}} contrib - Contribution from boon
     */
    showBoonPopup(boonId, contrib) {
        const boonCards = document.querySelectorAll('.boon-slots .card');
        let cardEl = null;
        for (const card of boonCards) {
            const cardData = card.dataset;
            if (cardData.id === boonId || card.querySelector(`[data-id="${boonId}"]`)) {
                cardEl = card;
                break;
            }
        }
        if (!cardEl) return;

        const rect = cardEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const bottomY = rect.bottom + 8;

        const parts = [];
        if (contrib.pips > 0) parts.push(`+${contrib.pips} pips`);
        if (contrib.favour > 0) parts.push(`+${this.engine.formatFavourContrib(contrib.favour)} favour`);
        if (parts.length === 0) return;

        const popup = document.createElement('div');
        popup.className = 'boon-contrib-popup';
        popup.textContent = parts.join('  ');
        popup.style.position = 'fixed';
        popup.style.left = `${centerX}px`;
        popup.style.top = `${bottomY}px`;
        popup.style.transform = 'translate(-50%, 0)';
        popup.style.zIndex = '10000';
        popup.style.pointerEvents = 'none';
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 900);
    }

    /**
     * Create particle effects for high scores
     * @param {HTMLElement} element - Anchor element
     * @param {number} score - Score value
     */
    createScoreParticles(element, score) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // More particles for higher scores
        const particleCount = Math.min(Math.floor(score / 20), 30);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'score-particle';
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = 30 + this.engine.prng.random() * 40;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            particle.style.animationDelay = `${i * 0.02}s`;
            
            // Color based on score
            if (score >= 300) {
                particle.style.background = 'radial-gradient(circle, #ff6b6b 0%, #ffd700 50%, transparent 100%)';
            } else {
                particle.style.background = 'radial-gradient(circle, #ffd700 0%, #ffed4e 50%, transparent 100%)';
            }
            
            document.body.appendChild(particle);
            
            setTimeout(() => particle.remove(), 1200);
        }
    }
}

if (typeof window !== 'undefined') window.ScoringAnimation = ScoringAnimation;
