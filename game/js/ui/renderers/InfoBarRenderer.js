/**
 * InfoBarRenderer - Trial, rolls, gold, score, clepsydra (turns remaining)
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

    updateClepsydra(gameState) {
        const remaining = this.turnsRemaining(gameState);
        const maxT = Math.max(1, gameState.maxTurns || 13);
        const roman = this.toRoman(remaining);
        const water = document.getElementById('clepsydraWater');
        const root = document.getElementById('clepsydra');
        const turnEl = document.getElementById('turnDisplay');
        if (turnEl) {
            turnEl.textContent = roman;
            turnEl.style.color = '';
            turnEl.style.fontWeight = '';
        }
        if (water) {
            const pct = (remaining / maxT) * 100;
            water.style.height = `${pct}%`;
        }
        if (root) {
            root.dataset.remaining = String(remaining);
            root.setAttribute('aria-valuenow', String(remaining));
            root.setAttribute('aria-valuemax', String(maxT));
            root.setAttribute('aria-valuetext', remaining <= 0 ? 'No turns remaining' : `${roman} turns remaining`);
            root.querySelectorAll('.clepsydra-marks li').forEach((li) => {
                const n = parseInt(li.getAttribute('data-n'), 10);
                li.classList.toggle('is-drained', Number.isFinite(n) && n > remaining);
            });
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

    /** @param {{ ante?: number, totalScore?: number, scoreThreshold?: number }} gameState */
    formatTrialBanner(gameState) {
        const fmt = (n) => (window.NumberFormat ? window.NumberFormat.display(n) : String(n));
        const ante = Math.max(1, gameState.ante ?? 1);
        const threshold = Math.max(0, gameState.scoreThreshold ?? 0);
        const total = Math.max(0, gameState.totalScore ?? 0);
        const remaining = Math.max(0, threshold - total);
        const trialLabel = ante === 1 ? 'Trial' : `Trial ${fmt(ante)}`;
        return `${trialLabel}: ${fmt(remaining)} remaining`;
    },

    updateTrialBanner(dom, gameState) {
        const el = dom.trialDisplay || document.getElementById('trialDisplay');
        if (!el) return;
        const text = this.formatTrialBanner(gameState);
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

        // In shop mode the single action button becomes "Reroll" — ShopUI.applyShopActionButton
        // owns its enabled/disabled state, so don't overwrite it here.
        const mainGame = document.querySelector('.main-game');
        const shopActive = mainGame?.classList.contains('shop-active');
        if (!shopActive && dom.rollButton) {
            const transitioningToShop = !!gameState.transitioningToShop;
            dom.rollButton.disabled = gameState.rollsLeft <= 0 || gameState.gameOver || transitioningToShop;
        }
    },

    updateBlindUI(_dom, _gameState, _gameEngine) {
        // Reserved hook: blind UI is currently rendered via scorecard and overlays.
    }
};

if (typeof window !== 'undefined') window.InfoBarRenderer = InfoBarRenderer;
