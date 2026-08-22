/**
 * LiveScoreController — Gnosis preview, cashout ticker, live DOM updates.
 * Scoring math stays on GameEngine.calculateScore / ScoringEngine.runPipeline.
 * @module LiveScoreController
 */

/* global GnosisDisplay, TIMING, GAME_BALANCE, Logger */

class LiveScoreController {
    /** Resting entry title — stays until an unrolled die is hovered. */
    static ENTRY_TITLE = 'Astragalomancy,';

    /** One line per die (index 0–4), shown while hovering that unrolled (?) die. */
    static ENTRY_DIE_LINES = [
        'Here lie the astragali',
        'Roll to make offerings to the pantheon',
        'Earn obols from the gods',
        'Drink libations, acquire boons, worship gods',
        'Acquire their favour and be rewarded.',
    ];

    /** Contribution chip: slide in from the right, then absorb into the number. */
    static ADD_CHIP_ABSORB_MS = 170;

    /** @param {GameEngine} engine */
    constructor(engine) {
        this.engine = engine;
        this._previewTimeout = null;
        this._cashoutInProgress = false;
        this._hoveredDieIndex = null;
        this._hoveredCategory = null;
        this._addChipTimers = new Map();
    }

    get dom() {
        return this.engine.dom;
    }

    get domReady() {
        return this.engine.domReady;
    }

    /** First ante / first turn only, before the first cast. */
    canShowUnrolledDieHints() {
        const s = this.engine?.state;
        return !!(s && !s.hasRolled && s.ante === 1 && (s.turn || 1) === 1);
    }

    /** Shared center banner (`#trialDisplay`) — entry tutorial, offering hover, trial remaining. */
    _setOfferingMessage(text) {
        const el = this.dom?.trialDisplay
            || (typeof document !== 'undefined' ? document.getElementById('trialDisplay') : null)
            || this.dom?.liveScoreDisplay?.querySelector('[data-live="category"]');
        if (el) {
            el.textContent = text ?? '';
            if (text) el.setAttribute('aria-label', text);
        }
    }

    _isSlotFilled(category) {
        if (!category) return false;
        const state = this.engine.state;
        if (typeof DevotionUtils !== 'undefined') {
            return DevotionUtils.getMarks(state, category) >= DevotionUtils.getCapacity(state, category);
        }
        return state.scorecard?.[category] !== undefined;
    }

    /** Offering line while a pantheon row is hovered (InfoBarRenderer must not clobber this). */
    hoverOfferingMessage() {
        if (!this._hoveredCategory) return null;
        const filled = this._isSlotFilled(this._hoveredCategory);
        if (!filled && typeof BlindDirector !== 'undefined') {
            const deny = BlindDirector.denyScore(this.engine.state, this._hoveredCategory);
            if (deny) return deny;
        }
        return this.engine.getLiveOfferingTitle(this._hoveredCategory, filled);
    }

    _restoreTrialBanner() {
        const hint = this.entryHintMessage();
        if (hint != null) {
            this._setOfferingMessage(hint);
            return;
        }
        if (typeof InfoBarRenderer !== 'undefined' && InfoBarRenderer.formatTrialBanner) {
            this._setOfferingMessage(InfoBarRenderer.formatTrialBanner(this.engine.state));
            return;
        }
        this._setOfferingMessage('');
    }

    /** Hover an unrolled die → matching tutorial line in the offering message. */
    onUnrolledDieHover(dieIndex) {
        if (!this.canShowUnrolledDieHints()) return;
        if (!Number.isInteger(dieIndex) || dieIndex < 0) return;
        const line = LiveScoreController.ENTRY_DIE_LINES[dieIndex];
        if (!line) return;
        this._hoveredDieIndex = dieIndex;
        this._setOfferingMessage(line);
    }

    /** Leave die → restore resting title (unless another die is already hovered). */
    onUnrolledDieLeave(dieIndex) {
        if (this._hoveredDieIndex !== dieIndex) return;
        this._hoveredDieIndex = null;
        if (!this.canShowUnrolledDieHints()) return;
        this._setOfferingMessage(LiveScoreController.ENTRY_TITLE);
    }

    /** Offering text while entry hints are active. */
    entryHintMessage() {
        if (!this.canShowUnrolledDieHints()) return null;
        if (this._hoveredDieIndex != null) {
            return LiveScoreController.ENTRY_DIE_LINES[this._hoveredDieIndex] || LiveScoreController.ENTRY_TITLE;
        }
        return LiveScoreController.ENTRY_TITLE;
    }

    schedulePreview(category) {
        this._hoveredCategory = category || null;
        if (category) {
            this._setOfferingMessage(this.engine.getLiveOfferingTitle(category, this._isSlotFilled(category)));
        }
        if (this._previewTimeout) clearTimeout(this._previewTimeout);
        this._previewTimeout = setTimeout(() => {
            this._previewTimeout = null;
            this.updateDisplay(category);
        }, typeof TIMING !== 'undefined' ? TIMING.LIVE_SCORE_DEBOUNCE_MS : 70);
    }

    cancelPreview() {
        this._hoveredCategory = null;
        if (this._previewTimeout) {
            clearTimeout(this._previewTimeout);
            this._previewTimeout = null;
        }
        this._restoreTrialBanner();
        this.updateDisplay(null);
    }

    /**
     * Contribution chip lifecycle: slide in from the right, hold, then absorb into
     * the number it feeds. Never moves the number itself — the chip is out of flow.
     * @param {HTMLElement|null} chip
     * @param {HTMLElement|null} contribNode
     * @param {boolean} wantShown
     * @param {string} [text]
     */
    _setAddChip(chip, contribNode, wantShown, text) {
        if (!chip) return;
        const pending = this._addChipTimers.get(chip);
        if (pending) {
            clearTimeout(pending);
            this._addChipTimers.delete(chip);
        }

        if (wantShown) {
            if (contribNode) contribNode.textContent = text ?? '';
            chip.classList.remove('is-absorbing');
            chip.removeAttribute('hidden');
            // Drop then re-add so a back-to-back contribution replays the slide-in.
            chip.classList.remove('is-entering');
            if (typeof chip.offsetWidth === 'number') void chip.offsetWidth;
            chip.classList.add('is-entering');
            return;
        }

        const wasShown = !chip.hasAttribute('hidden');
        chip.classList.remove('is-entering');
        if (!wasShown) {
            if (contribNode) contribNode.textContent = '';
            chip.setAttribute('hidden', '');
            return;
        }

        chip.classList.add('is-absorbing');
        const timer = setTimeout(() => {
            this._addChipTimers.delete(chip);
            chip.classList.remove('is-absorbing');
            chip.setAttribute('hidden', '');
            if (contribNode) contribNode.textContent = '';
        }, LiveScoreController.ADD_CHIP_ABSORB_MS);
        this._addChipTimers.set(chip, timer);
    }

    /**
     * @param {HTMLElement} el
     * @param {Object} o
     */
    updateValues(el, o) {
        if (!el || !el.hasAttribute('data-live-root')) return;
        const q = (key) => el.querySelector(`[data-live="${key}"]`);
        const set = (key, val) => { const n = q(key); if (n) n.textContent = val ?? ''; };

        // Category label (if present inside live-score root only).
        const categoryEl = q('category');
        if (categoryEl) categoryEl.textContent = o.category ?? '';
        const row = q('row');
        const rowNa = q('row-na');
        if (o.showNa) {
            if (row) row.setAttribute('hidden', '');
            if (rowNa) rowNa.removeAttribute('hidden');
            return;
        }
        if (row) row.removeAttribute('hidden');
        if (rowNa) rowNa.setAttribute('hidden', '');

        set('pips', o.pips);
        set('pips-label', o.pipsLabel);
        set('favour', o.favour);
        set('favour-label', o.favourLabel);

        if (o.pipsAdd != null) {
            this._setAddChip(q('pips-add'), q('pips-contrib'), o.pipsAdd, o.pipsContrib);
        }
        if (o.favourAdd != null) {
            this._setAddChip(q('favour-add'), q('favour-contrib'), o.favourAdd, o.favourContrib);
        }
        if (o.pipsPulse) {
            const p = q('pips');
            if (p) { p.classList.add('pips-pulse'); setTimeout(() => p.classList.remove('pips-pulse'), 300); }
        }
        if (o.favourPulse) {
            const f = q('favour');
            if (f) { f.classList.add('favour-pulse'); setTimeout(() => f.classList.remove('favour-pulse'), 300); }
        }
    }

    updateDisplay(category) {
        const e = this.engine;
        if (!this.domReady || !this.dom.liveScoreDisplay) return;
        if (e.liveScoreAnimationTimeout) clearTimeout(e.liveScoreAnimationTimeout);
        const el = this.dom.liveScoreDisplay;

        // First roll clears die-hover tutorial state.
        if (e.state.hasRolled) this._hoveredDieIndex = null;

        this._hoveredCategory = category || null;
        const slotFilled = this._isSlotFilled(category);
        const gnosis = typeof GnosisDisplay !== 'undefined' ? GnosisDisplay : null;
        const offeringTitle = category ? e.getLiveOfferingTitle(category, slotFilled) : null;
        if (offeringTitle) this._setOfferingMessage(offeringTitle);
        else this._restoreTrialBanner();

        if (!category || !e.state.hasRolled) {
            const levelBonus = category ? e.getCategoryLevelBonuses(category) : { pips: 0, mult: (typeof BASE_FAVOUR !== 'undefined' ? BASE_FAVOUR : 100) };
            const hint = !category ? this.entryHintMessage() : null;
            this.updateValues(el, {
                category: hint != null ? hint : (offeringTitle || e.getLiveOfferingTitle(category, slotFilled)),
                pips: '0',
                pipsLabel: gnosis ? gnosis.formatPipsLabel(category, e.state) : 'pips',
                pipsAdd: false,
                favour: category ? e.formatFavour(levelBonus.mult) : '0',
                favourLabel: 'favour',
                favourAdd: false,
                showNa: false,
            });
            el.classList.remove('balatro-preview');
            el.classList.add('visible');
            e.lastPreviewPips = 0;
            e.lastPreviewFavour = 0;
            return;
        }

        // Full devotion: N/A preview without calling calculateScore (avoids devotion_full ERROR).
        if (slotFilled) {
            this.updateValues(el, {
                category: offeringTitle,
                pipsLabel: gnosis ? gnosis.formatPipsLabel(category, e.state) : 'pips',
                showNa: true,
            });
            el.classList.remove('balatro-preview');
            el.classList.add('visible');
            return;
        }

        const { pips, favour, isValid } = e.calculateScore(category);

        if (!isValid) {
            const counts = gnosis ? gnosis.getFacesAndCounts(e.state).counts : {};
            this.updateValues(el, {
                category: offeringTitle,
                pipsLabel: gnosis ? gnosis.formatPipsLabel(category, e.state, counts) : 'pips',
                showNa: true,
            });
            el.classList.remove('balatro-preview');
            el.classList.add('visible');
            return;
        }

        const split = gnosis
            ? gnosis.buildPreviewSplit(category, e.state, { pips, isValid })
            : { dicePips: pips, extraPips: 0, pipsLabel: 'pips', counts: {} };

        this.updateValues(el, {
            category: offeringTitle,
            pips: String(split.dicePips),
            pipsLabel: split.pipsLabel,
            pipsAdd: split.extraPips > 0,
            pipsContrib: split.extraPips > 0 ? String(split.extraPips) : '',
            favour: e.formatFavour(favour),
            favourLabel: 'favour',
            favourAdd: false,
            showNa: false,
        });
        el.classList.add('balatro-preview', 'visible');

        e.lastPreviewPips = pips;
        e.lastPreviewFavour = favour;
    }

    /** Pre-shop cashout ticker in live-score area, then open shop. */
    showInterestThenOpenShop(opts = {}) {
        const e = this.engine;
        if (this._cashoutInProgress) return;
        this._cashoutInProgress = true;
        e.state.transitioningToShop = true;
        e.updateAllUI(true);

        const pantheonTotal = opts.pantheonTotal;
        const scoresCount = e.state.scoresThisRound || 0;
        const scoresGold = scoresCount * GAME_BALANCE.GOLD_PER_SCORE;
        const goldAfterScores = e.state.gold + scoresGold;
        const interest = e.calculateInterestOnAmount(goldAfterScores);
        const roundGained = scoresGold + interest;
        let payoutAwarded = false;

        const doOpenShop = () => {
            if (!payoutAwarded && roundGained > 0) {
                e.updateGoldAnimated(roundGained, 'cashout');
                payoutAwarded = true;
            }
            e.state.scoresThisRound = 0;
            if (opts.pantheonTotal != null) {
                e.state.scorecard = {};
                e.state.totalScore = 0;
                if (typeof DevotionUtils !== 'undefined') {
                    DevotionUtils.resetTrialDevotion(e.state);
                }
            }
            this._cashoutInProgress = false;
            e.state.transitioningToShop = false;
            e.openShop();
        };

        const liveScoreDisplay = this.dom.liveScoreDisplay;
        const cashoutContent = this.dom.liveCashoutContent;
        const cashoutLine = this.dom.liveCashoutLine;
        if (!this.domReady || !liveScoreDisplay || !cashoutContent) {
            doOpenShop();
            return;
        }

        const steps = [];
        if (pantheonTotal != null) {
            steps.push({
                type: 'pantheon',
                label: 'Pantheon',
                amount: String(pantheonTotal),
                hold: 900,
            });
        }
        if (opts.hubrisDepart) {
            const left = opts.unusedCategories;
            const rites = (left != null && left > 0)
                ? `${left} rite${left === 1 ? '' : 's'} unfinished`
                : 'rites unfinished';
            steps.push({
                type: 'hubris',
                text: `Hubris — left the symposium early (${rites})`,
                hold: 900,
            });
        }
        steps.push({ type: 'offerings', label: 'Offerings', amount: `+${scoresGold}`, hold: 820 });
        steps.push({ type: 'surplus', label: 'Surplus', amount: `+${interest}`, hold: 820 });
        steps.push({ type: 'payout', label: 'Received', amount: `+${roundGained}`, hold: 1100 });

        this._resetCashoutLedger(cashoutContent, cashoutLine);

        let i = 0;
        const renderStep = (stepIndex) => {
            const s = steps[stepIndex];
            const row = this._appendCashoutRow(cashoutContent, s);
            if (s.type === 'pantheon') {
                const scoreExceedsRequired = opts.pantheonThreshold != null && pantheonTotal >= opts.pantheonThreshold;
                row.classList.add('gnosis-pantheon-value');
                if (scoreExceedsRequired) row.classList.add('pantheon-success-flash');
            }
            if (s.type === 'payout' && !payoutAwarded && roundGained > 0) {
                e.updateGoldAnimated(roundGained, 'cashout');
                payoutAwarded = true;
            }
            if (window.soundManager) {
                if (s.type === 'offerings' || s.type === 'surplus') {
                    window.soundManager.play('chips1', { pitch: 1.02, volume: 0.4 });
                } else if (s.type === 'pantheon') {
                    window.soundManager.play('foil1', { pitch: 0.96, volume: 0.42 });
                } else if (s.type === 'hubris') {
                    window.soundManager.play('whoosh', { pitch: 0.9, volume: 0.32 });
                }
            }
            if (s.type === 'payout' && window.juiceManager) {
                window.juiceManager.juiceUp(row, 0.18);
            }
            cashoutContent.classList.remove('hidden');
            liveScoreDisplay.classList.add('cashout-mode', 'visible');
        };

        const advance = () => {
            if (i >= steps.length) {
                if (window.soundManager) window.soundManager.play('cardSlide1', { pitch: 0.95, volume: 0.5 });
                setTimeout(() => {
                    liveScoreDisplay.classList.remove('cashout-mode');
                    cashoutContent.classList.add('hidden');
                    this._resetCashoutLedger(cashoutContent, cashoutLine);
                    this.updateDisplay(null);
                    Logger.info(`Cashout: +${roundGained}g (scores ${scoresGold}g + interest ${interest}g)`);
                    doOpenShop();
                }, this._cashoutBeat(700));
                return;
            }
            const current = steps[i];
            renderStep(i);
            i += 1;
            setTimeout(advance, this._cashoutBeat(current.hold));
        };
        advance();
    }

    /**
     * Cashout is a results ledger — hold wall-clock so game speed cannot blur it.
     * @param {number} ms
     */
    _cashoutBeat(ms) {
        return Math.max(1, Math.round(ms));
    }

    _resetCashoutLedger(cashoutContent, cashoutLine) {
        if (!cashoutContent) return;
        cashoutContent.querySelectorAll('[data-cashout-row]').forEach((n) => n.remove());
        if (cashoutLine) {
            cashoutLine.textContent = '';
            cashoutLine.hidden = true;
        }
    }

    _appendCashoutRow(cashoutContent, step) {
        const row = document.createElement('div');
        row.className = 'gnosis-cashout-line';
        row.dataset.cashoutRow = step.type || '';
        if (step.type === 'payout') row.classList.add('is-payout');
        if (step.type === 'hubris') row.classList.add('is-hubris');
        if (step.text && !step.label) {
            row.textContent = step.text;
        } else {
            if (step.label) {
                const why = document.createElement('span');
                why.className = 'gnosis-cashout-why';
                why.textContent = step.label;
                row.appendChild(why);
            }
            if (step.amount != null) {
                const amt = document.createElement('span');
                amt.className = 'gnosis-cashout-amt';
                amt.textContent = step.amount;
                row.appendChild(amt);
            }
        }
        cashoutContent.appendChild(row);
        return row;
    }
}

if (typeof window !== 'undefined') window.LiveScoreController = LiveScoreController;
