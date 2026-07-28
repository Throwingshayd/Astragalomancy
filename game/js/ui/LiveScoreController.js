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

    /** @param {GameEngine} engine */
    constructor(engine) {
        this.engine = engine;
        this._previewTimeout = null;
        this._cashoutInProgress = false;
        this._hoveredDieIndex = null;
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

    /** Shared center banner (`#trialDisplay`) — entry tutorial + trial remaining. */
    _setOfferingMessage(text) {
        const el = document.getElementById('trialDisplay')
            || this.dom.liveScoreDisplay?.querySelector('[data-live="category"]');
        if (el) {
            el.textContent = text ?? '';
            if (text) el.setAttribute('aria-label', text);
        }
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
        if (this._previewTimeout) clearTimeout(this._previewTimeout);
        this._previewTimeout = setTimeout(() => {
            this._previewTimeout = null;
            this.updateDisplay(category);
        }, typeof TIMING !== 'undefined' ? TIMING.LIVE_SCORE_DEBOUNCE_MS : 70);
    }

    cancelPreview() {
        if (this._previewTimeout) {
            clearTimeout(this._previewTimeout);
            this._previewTimeout = null;
        }
        this.updateDisplay(null);
    }

    /**
     * @param {HTMLElement} el
     * @param {Object} o
     */
    updateValues(el, o) {
        if (!el || !el.hasAttribute('data-live-root')) return;
        const q = (key) => el.querySelector(`[data-live="${key}"]`);
        const set = (key, val) => { const n = q(key); if (n) n.textContent = val ?? ''; };
        const hide = (key) => { const n = q(key); if (n) n.setAttribute('hidden', ''); };
        const show = (key) => { const n = q(key); if (n) n.removeAttribute('hidden'); };

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
            set('pips-contrib', o.pipsAdd ? o.pipsContrib : '');
            o.pipsAdd ? show('pips-add') : hide('pips-add');
        }
        if (o.favourAdd != null) {
            set('favour-contrib', o.favourAdd ? o.favourContrib : '');
            o.favourAdd ? show('favour-add') : hide('favour-add');
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
        if (window.juiceManager) {
            window.juiceManager.cancelJuice(el);
            const row = el.querySelector('[data-live="row"]');
            if (row) window.juiceManager.cancelJuice(row);
        }

        // First roll clears die-hover tutorial state.
        if (e.state.hasRolled) this._hoveredDieIndex = null;

        const slotFilled = !!(category && typeof DevotionUtils !== 'undefined'
            ? !DevotionUtils.canScoreCategory(e.state, category)
            : e.state.scorecard[category] !== undefined);
        const gnosis = typeof GnosisDisplay !== 'undefined' ? GnosisDisplay : null;

        if (!category || !e.state.hasRolled) {
            const levelBonus = category ? e.getCategoryLevelBonuses(category) : { pips: 0, mult: 1 };
            const hint = !category ? this.entryHintMessage() : null;
            if (hint != null) this._setOfferingMessage(hint);
            this.updateValues(el, {
                category: hint != null ? hint : e.getLiveOfferingTitle(category, slotFilled),
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

        const { pips, favour, isValid } = e.calculateScore(category);

        if (!isValid) {
            const counts = gnosis ? gnosis.getFacesAndCounts(e.state).counts : {};
            this.updateValues(el, {
                category: e.getLiveOfferingTitle(category, typeof DevotionUtils !== 'undefined'
                    ? !DevotionUtils.canScoreCategory(e.state, category)
                    : e.state.scorecard[category] !== undefined),
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

        const isScored = typeof DevotionUtils !== 'undefined'
            ? !DevotionUtils.canScoreCategory(e.state, category)
            : e.state.scorecard[category] !== undefined;
        this.updateValues(el, {
            category: e.getLiveOfferingTitle(category, isScored),
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

        if (window.juiceManager && (e.lastPreviewPips !== undefined || e.lastPreviewFavour !== undefined)) {
            const dP = pips - (e.lastPreviewPips ?? 0);
            const dF = favour - (e.lastPreviewFavour ?? 0);
            if (dP !== 0 || dF !== 0) {
                const row = el.querySelector('[data-live="row"]');
                if (row) window.juiceManager.juiceUp(row, 0.12);
            }
        }
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
        if (!this.domReady || !liveScoreDisplay || !cashoutContent || !cashoutLine) {
            doOpenShop();
            return;
        }

        const drachmaWord = (n) => (Math.abs(n) === 1 ? 'drachma' : 'drachmae');
        const steps = [];
        if (pantheonTotal != null) {
            steps.push({ type: 'pantheon', text: `Pantheon reckoning: ${pantheonTotal}` });
        }
        if (opts.hubrisDepart) {
            const left = opts.unusedCategories;
            const rites = (left != null && left > 0)
                ? `${left} rite${left === 1 ? '' : 's'} unfinished`
                : 'rites unfinished';
            steps.push({ type: 'hubris', text: `Hubris — left the symposium early (${rites})` });
        }
        steps.push({ type: 'offerings', text: `Offerings made: +${scoresGold} ${drachmaWord(scoresGold)}` });
        steps.push({ type: 'surplus', text: `Surplus of the gods: +${interest} ${drachmaWord(interest)}` });
        steps.push({ type: 'payout', text: `Drachma received: +${roundGained} ${drachmaWord(roundGained)}` });
        steps.push({ type: 'footer', text: 'Off to market' });

        let i = 0;
        const stepMs = e.scaleDelay(850);

        const renderStep = (stepIndex) => {
            const s = steps[stepIndex];
            cashoutLine.textContent = s.text;
            cashoutLine.classList.remove('gnosis-pantheon-value', 'pantheon-success-flash');
            if (s.type === 'pantheon') {
                const scoreExceedsRequired = opts.pantheonThreshold != null && pantheonTotal >= opts.pantheonThreshold;
                cashoutLine.classList.add('gnosis-pantheon-value');
                if (scoreExceedsRequired) cashoutLine.classList.add('pantheon-success-flash');
            }
            if (s.type === 'payout' && !payoutAwarded && roundGained > 0) {
                e.updateGoldAnimated(roundGained, 'cashout');
                payoutAwarded = true;
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
                    cashoutLine.textContent = '';
                    this.updateDisplay(null);
                    Logger.info(`Cashout: +${roundGained}g (scores ${scoresGold}g + interest ${interest}g)`);
                    doOpenShop();
                }, e.scaleDelay(650));
                return;
            }
            renderStep(i);
            i += 1;
            setTimeout(advance, stepMs);
        };
        advance();
    }
}

if (typeof window !== 'undefined') window.LiveScoreController = LiveScoreController;
