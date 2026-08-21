/**
 * InfoBarRenderer - Trial, rolls, gold, score, clepsydra (turn count + draining sand)
 * @module ui/renderers/InfoBarRenderer
 */

const InfoBarRenderer = {
    /** @param {number} n */
    toRoman(n) {
        const num = Math.floor(Number(n));
        if (!Number.isFinite(num) || num <= 0) return '·';
        if (num > 39) return String(num);
        const map = [
            [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
        ];
        let remaining = num;
        let out = '';
        for (const [val, sym] of map) {
            while (remaining >= val) {
                out += sym;
                remaining -= val;
            }
        }
        return out;
    },

    /**
     * Turns left this ante (XIII full → · empty).
     * @param {{ turn?: number, maxTurns?: number }} gameState
     */
    turnsRemaining(gameState) {
        const maxT = Math.max(1, gameState.maxTurns || 13);
        const turn = Math.max(1, gameState.turn || 1);
        return Math.max(0, maxT - turn + 1);
    },

    /**
     * The turn number the player reads on the plaque: I on the first turn, rising to
     * maxTurns. The relic still drains, so numeral and sand run opposite on purpose —
     * the numeral answers "which turn is this", the sand "how much is left".
     * @param {{ turn?: number, maxTurns?: number }} gameState
     */
    turnNumber(gameState) {
        const maxT = Math.max(1, gameState.maxTurns || 13);
        return Math.min(maxT, Math.max(1, gameState.turn || 1));
    },

    /**
     * Sand colour / urgency driven off turns left.
     * @param {number} remaining
     */
    clepsydraState(remaining) {
        if (remaining <= 0) return 'empty';
        if (remaining <= 1) return 'critical';
        if (remaining <= 3) return 'low';
        return 'calm';
    },

    /**
     * Ticks along the hourglass pillar — rebuilt when maxTurns changes
     * (unlocking Sevens/Eights/Nines raises it above the base 13).
     * @param {number} maxT
     */
    syncClepsydraTicks(maxT) {
        const marks = document.getElementById('clepsydraMarks');
        if (!marks || marks.dataset.count === String(maxT)) return marks;
        const frag = document.createDocumentFragment();
        for (let i = 1; i <= maxT; i++) {
            const tick = document.createElement('span');
            tick.className = (i % 5 === 0 || i === maxT) ? 'clepsydra-tick is-major' : 'clepsydra-tick';
            tick.dataset.n = String(i);
            tick.style.bottom = `${(i / maxT) * 100}%`;
            frag.appendChild(tick);
        }
        marks.textContent = '';
        marks.appendChild(frag);
        marks.dataset.count = String(maxT);
        return marks;
    },

    /** @param {HTMLElement} root */
    pulseClepsydra(root) {
        clearTimeout(this._drainTimer);
        root.classList.remove('is-draining');
        // Reflow so the settle animation replays on back-to-back turns.
        root.getBoundingClientRect();
        root.classList.add('is-draining');
        this.burstSandGrains(14);
        this._drainTimer = setTimeout(() => root.classList.remove('is-draining'), 520);
    },

    /** Flip when a new trial/ante restores a full turn count. */
    flipClepsydra(root) {
        clearTimeout(this._flipTimer);
        root.classList.remove('is-flipping');
        root.getBoundingClientRect();
        root.classList.add('is-flipping');
        this.burstSandGrains(22);
        if (window.soundManager) {
            window.soundManager.play('whoosh', { pitch: 0.85, volume: 0.35 });
        }
        this._flipTimer = setTimeout(() => root.classList.remove('is-flipping'), 980);
    },

    /**
     * Lightweight grain particles at the hourglass neck (DOM, not Unity PS).
     * @param {number} count
     */
    burstSandGrains(count) {
        const host = document.getElementById('clepsydraGrains');
        if (!host) return;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        if (reduce) return;
        const n = Math.max(1, Math.min(28, count | 0));
        for (let i = 0; i < n; i++) {
            const g = document.createElement('span');
            g.className = 'clepsydra-grain';
            const drift = ((Math.random() * 10) - 5).toFixed(1);
            g.style.setProperty('--gx', `${drift}px`);
            g.style.animationDelay = `${(Math.random() * 0.18).toFixed(2)}s`;
            g.style.width = `${2 + Math.floor(Math.random() * 3)}px`;
            g.style.height = g.style.width;
            host.appendChild(g);
            setTimeout(() => g.remove(), 1100);
        }
    },

    /** Idle trickle while turns remain. */
    ensureSandTrickle(active) {
        clearInterval(this._grainTrickle);
        this._grainTrickle = null;
        if (!active) return;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        if (reduce) return;
        this._grainTrickle = setInterval(() => this.burstSandGrains(2), 420);
    },

    updateClepsydra(gameState) {
        const remaining = this.turnsRemaining(gameState);
        const maxT = Math.max(1, gameState.maxTurns || 13);
        const turnNo = this.turnNumber(gameState);
        const roman = this.toRoman(turnNo);
        const pct = Math.max(0, Math.min(100, (remaining / maxT) * 100));
        const stream = document.getElementById('clepsydraStream');
        const root = document.getElementById('clepsydra');
        const turnEl = document.getElementById('turnDisplay');
        if (turnEl) {
            turnEl.textContent = roman;
            turnEl.style.color = '';
            turnEl.style.fontWeight = '';
        }
        // Fill vars kept for ticks / future art swaps; sand is baked into the sprite.
        if (root) {
            root.style.setProperty('--clep-top', `${pct}%`);
            root.style.setProperty('--clep-bot', `${100 - pct}%`);
        }
        if (stream) stream.style.opacity = remaining <= 0 ? '0' : '';
        if (!root) return;

        const previous = Number(root.dataset.remaining);
        root.dataset.remaining = String(remaining);
        root.dataset.state = this.clepsydraState(remaining);
        root.setAttribute('aria-valuenow', String(turnNo));
        root.setAttribute('aria-valuemax', String(maxT));
        root.setAttribute('aria-valuetext', remaining <= 0 ? 'No turns remaining' : `Turn ${roman} of ${maxT}`);

        const marks = this.syncClepsydraTicks(maxT);
        marks?.querySelectorAll('.clepsydra-tick').forEach((tick) => {
            const n = parseInt(tick.dataset.n, 10);
            tick.classList.toggle('is-drained', Number.isFinite(n) && n > remaining);
            tick.classList.toggle('is-current', n === remaining);
        });

        this.ensureSandTrickle(remaining > 0);

        if (Number.isFinite(previous)) {
            if (remaining < previous) this.pulseClepsydra(root);
            // New ante / restored clock — cinematic flip like resetting an hourglass.
            if (remaining > previous && remaining >= maxT - 0.5) this.flipClepsydra(root);
        }
    },

    updateRollsPips(gameState) {
        const left = Math.max(0, gameState.rollsLeft ?? 0);
        const root = document.getElementById('rollsPips');
        const pips = root?.querySelectorAll('.rolls-pip');
        if (pips) {
            pips.forEach((pip, i) => {
                pip.classList.toggle('is-spent', i >= left);
            });
        }
        if (root) {
            root.setAttribute('aria-valuenow', String(left));
            root.setAttribute('aria-valuetext', `${left} roll${left === 1 ? '' : 's'} remaining`);
        }
    },

    /** @param {number} n */
    toOrdinal(n) {
        const num = Math.floor(Number(n));
        if (!Number.isFinite(num) || num <= 0) return String(n);
        const mod100 = num % 100;
        if (mod100 >= 11 && mod100 <= 13) return `${num}th`;
        switch (num % 10) {
            case 1: return `${num}st`;
            case 2: return `${num}nd`;
            case 3: return `${num}rd`;
            default: return `${num}th`;
        }
    },

    /** @param {{ ante?: number, totalScore?: number, scoreThreshold?: number, hasRolled?: boolean, turn?: number }} gameState */
    formatTrialBanner(gameState) {
        const fmt = (n) => (window.NumberFormat ? window.NumberFormat.display(n) : String(n));
        const ante = Math.max(1, gameState.ante ?? 1);
        const threshold = Math.max(0, gameState.scoreThreshold ?? 0);
        const total = Math.max(0, gameState.totalScore ?? 0);
        const remaining = Math.max(0, threshold - total);
        const base = `${this.toOrdinal(ante)} Trial: ${fmt(remaining)} remaining`;
        const blindId = gameState.activeBlind;
        if (blindId && blindId !== 'none' && typeof BlindDirector !== 'undefined') {
            const def = BlindDirector.getDef(blindId);
            // Named all trial so it can be planned for, but it only bites in the last stretch.
            if (def?.blindName) {
                const waiting = BlindDirector.isLive(gameState) ? '' : ' waits';
                return `${base} · ${def.blindName}${waiting}`;
            }
        }
        return base;
    },

    updateTrialBanner(dom, gameState) {
        const el = dom.trialDisplay || document.getElementById('trialDisplay');
        if (!el) return;
        // Entry hover tutorial owns this slot until the first cast (ante 1 / turn 1).
        const live = window.game?.ensureLiveScore?.();
        const hint = live?.entryHintMessage?.();
        const hover = live?.hoverOfferingMessage?.();
        const text = hint != null ? hint : (hover != null ? hover : this.formatTrialBanner(gameState));
        el.textContent = text;
        el.setAttribute('aria-label', text);
    },

    updateInfoUI(dom, gameState) {
        const fmt = (n) => (window.NumberFormat ? window.NumberFormat.display(n) : String(n));
        this.updateTrialBanner(dom, gameState);
        if (dom.rollsLeft) dom.rollsLeft.textContent = fmt(gameState.rollsLeft);
        if (dom.goldDisplay) dom.goldDisplay.textContent = fmt(gameState.gold);
        if (dom.totalScore) dom.totalScore.textContent = fmt(gameState.totalScore);
        if (dom.scoreThresholdDisplay) dom.scoreThresholdDisplay.textContent = fmt(gameState.scoreThreshold);

        this.updateClepsydra(gameState);
        this.updateRollsPips(gameState);

        // In shop mode #rollButton is Continue — ShopUI.applyShopActionButton owns labels;
        // marble #shopContinueBtn is Reroll and owns its own disabled state.
        const mainGame = document.querySelector('.main-game');
        const shopActive = mainGame?.classList.contains('shop-active');
        if (!shopActive && dom.rollButton) {
            const transitioningToShop = !!gameState.transitioningToShop;
            dom.rollButton.disabled = gameState.rollsLeft <= 0 || gameState.gameOver || transitioningToShop;
        }
    },

    updateBlindUI(_dom, _gameState, _gameEngine) {
        // Reserved hook: the active blind rides the trial banner (formatTrialBanner).
    }
};

if (typeof window !== 'undefined') window.InfoBarRenderer = InfoBarRenderer;
