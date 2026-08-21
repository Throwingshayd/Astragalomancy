/**
 * Boss blinds — random assignment + live rules.
 * Thresholds stay on the AnteData curve; only the blind is rolled (run prng).
 * @module BlindDirector
 */

const BLIND_CATALOG = {
    none: {
        blindName: 'No Blind',
        blindEffect: 'No special effect',
    },
    no_held_dice: {
        blindName: 'Rolling Stones',
        blindEffect: 'Cannot hold dice. Score the roll you have.',
    },
    no_worship: {
        blindName: 'Sacred Silence',
        blindEffect: 'Cannot use Worship this trial. You may still buy it.',
    },
    half_upper_pips: {
        blindName: 'Barren Fields',
        blindEffect: 'Ones–Sixes score half pips. Lean on the Greater Pantheon.',
    },
    max_3_hold: {
        blindName: 'Iron Fist',
        blindEffect: 'Hold at most three dice.',
    },
    no_chance: {
        blindName: 'Broken Ritual',
        blindEffect: 'Chance cannot be scored. Plan twelve real rites.',
    },
    score_penalty: {
        blindName: 'Reckless Speed',
        blindEffect: 'Required score is 50% higher.',
    },
    no_consumables: {
        blindName: 'Solitary Path',
        blindEffect: 'Cannot drink Libations this trial. You may still buy them.',
    },
    hook_yank: {
        blindName: 'The Hook',
        blindEffect: 'When you roll, one random held die is snatched and rolls anyway.',
    },
    the_eye: {
        blindName: 'The Eye',
        blindEffect: 'Offerings may only move up the pantheon. Skip ahead if you must — you cannot go back.',
    },
};

/** Ones → Nines → Greater Pantheon → Chance. Skip is allowed; going back is not. */
const SCORE_LADDER = [
    'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
    'Sevens', 'Eights', 'Nines',
    'Three of a Kind', 'Small Straight', 'Full House',
    'Four of a Kind', 'Large Straight', 'Yahtzee',
    'Chance', "Pandora's Box",
];

const SHOWDOWN_BLIND_ID = 'the_eye';

/** Shops open when the turn counter reaches these — two breaks split a trial in three. */
const SHOP_TURNS = [4, 8];

/** The boss rules the last stretch only: from the second shop to the end of the trial. */
const BOSS_SEGMENT_START_TURN = SHOP_TURNS[SHOP_TURNS.length - 1];

/** Mid-run pool. Showdown (The Eye) is assigned only on the last trial of a cycle. */
const PLAYABLE_BLIND_IDS = [
    'no_held_dice',
    'no_worship',
    'half_upper_pips',
    'max_3_hold',
    'no_chance',
    'score_penalty',
    'no_consumables',
    'hook_yank',
];

const BlindDirector = {
    catalog: BLIND_CATALOG,
    playableIds: PLAYABLE_BLIND_IDS,
    showdownId: SHOWDOWN_BLIND_ID,
    scoreLadder: SCORE_LADDER,
    shopTurns: SHOP_TURNS,
    bossSegmentStartTurn: BOSS_SEGMENT_START_TURN,

    blindsEnabled() {
        return !(typeof DEBUG_FLAGS !== 'undefined' && DEBUG_FLAGS.BOSS_BLINDS_DISABLED);
    },

    /** Final stretch of the trial — the only segment the boss holds. */
    isBossSegment(state) {
        return (state?.turn || 1) >= BOSS_SEGMENT_START_TURN;
    },

    /**
     * The blind is assigned for the whole trial so it can be planned around, but it
     * only enforces in the boss segment. Every rule below reads through this.
     */
    isLive(state) {
        return this.liveBlind(state) !== null;
    },

    /** Which blind is enforcing right now — null until the boss segment. */
    liveBlind(state) {
        if (!this.blindsEnabled()) return null;
        const blind = state?.activeBlind;
        if (!blind || blind === 'none') return null;
        return this.isBossSegment(state) ? blind : null;
    },

    /** Amber Acorn-style finisher: last trial of the 12-ante cycle (12, 24, …). */
    isShowdownAnte(ante) {
        const cycle = (typeof AnteData !== 'undefined' && AnteData.length) ? AnteData.length : 12;
        return ante > 1 && ante % cycle === 0;
    },

    getDef(blindId) {
        return BLIND_CATALOG[blindId] || BLIND_CATALOG.none;
    },

    pickPlayableId(prng, lastBlindId) {
        const pool = PLAYABLE_BLIND_IDS.filter((id) => id !== lastBlindId);
        const use = pool.length ? pool : PLAYABLE_BLIND_IDS.slice();
        const idx = Math.floor(prng.random() * use.length);
        return use[idx];
    },

    /**
     * @param {Object} state
     * @param {{ random: () => number }} prng
     */
    planAnte(state, prng) {
        const ante = Math.max(1, state?.ante || 1);
        const curve = (typeof getAnteData === 'function'
            ? getAnteData(ante - 1)
            : (typeof AnteData !== 'undefined' ? AnteData[ante - 1] : null))
            || { name: 'The Fool', scoreThreshold: 200 };
        let blindId = 'none';
        if (this.blindsEnabled() && ante > 1) {
            blindId = this.isShowdownAnte(ante)
                ? SHOWDOWN_BLIND_ID
                : this.pickPlayableId(prng, state.lastBlindId);
        }
        const def = this.getDef(blindId);
        let scoreThreshold = curve.scoreThreshold;
        if (blindId === 'score_penalty') {
            scoreThreshold = Math.floor(scoreThreshold * 1.5);
        }
        return {
            ante,
            name: curve.name,
            blindId,
            blindName: def.blindName,
            blindEffect: def.blindEffect,
            scoreThreshold,
        };
    },

    applyPlan(state, plan) {
        if (!state || !plan) return;
        state.activeBlind = this.blindsEnabled() ? plan.blindId : 'none';
        state.scoreThreshold = plan.scoreThreshold;
        state.lastBlindId = state.activeBlind;
        state.pendingBlindPlan = plan;
        state.eyeFloorRank = -1;
    },

    /** Call when ante increments, before the between-trial shop. */
    prepareNextAnte(engine) {
        const plan = this.planAnte(engine.state, engine.prng);
        this.applyPlan(engine.state, plan);
        return plan;
    },

    startAnte(engine) {
        let plan = engine.state.pendingBlindPlan;
        if (!plan || plan.ante !== engine.state.ante) {
            plan = this.planAnte(engine.state, engine.prng);
            this.applyPlan(engine.state, plan);
        }
        if (engine.domReady && engine.state.ante > 1) {
            this.showTransition(engine, plan, () => this.finalize(engine, plan));
        } else {
            this.finalize(engine, plan);
        }
    },

    finalize(engine, plan) {
        if (engine.stateManager) {
            engine.stateManager.setState(engine.gameStates?.ROUND || 'ROUND');
        }
        this.applyPlan(engine.state, plan);
        engine.state.pendingBlindPlan = null;
        engine.state.hadOtherBoonsThisAnte = false;
        engine.applyArtifactEffects();
        engine.state.rolledBonusYahtzees = 0;
        // applyArtifactEffects ran just above, so the Tyche bonus is already current.
        engine.state.rollsLeft = ArtifactEffects.rollsPerTurn(engine.state);
        engine.state.boons.forEach((boon) => {
            if (boon.timing && boon.timing.turn_start) {
                boon.onTimingEvent('turn_start', engine.state, undefined, engine);
            }
        });
        if (engine.domReady) engine.updateAllUI(true);
        if (typeof Logger !== 'undefined') {
            Logger.info(`Trial ${plan.ante} boss: ${plan.blindName}`, {
                blindId: plan.blindId,
                threshold: plan.scoreThreshold,
                effect: plan.blindEffect,
            });
        }
    },

    showTransition(engine, plan, callback) {
        if (engine.stateManager) {
            engine.stateManager.setState(engine.gameStates?.BLIND_SELECT || 'BLIND_SELECT');
        }
        const overlay = document.createElement('div');
        const isShowdown = plan.blindId === SHOWDOWN_BLIND_ID;
        overlay.className = `ante-transition-overlay${isShowdown ? ' is-showdown' : ''}`;
        overlay.style.opacity = '0';
        const modal = document.createElement('div');
        modal.className = `ante-transition-modal${isShowdown ? ' is-showdown' : ''}`;
        modal.innerHTML = `
            <div class="ante-header">
                <div class="ante-number">${isShowdown ? 'Showdown' : `Trial ${engine.state.ante}`}</div>
                <div class="ante-boss-name">${plan.name}</div>
            </div>
            <div class="ante-blind-section">
                <div class="blind-label">${isShowdown ? 'Face-Off' : 'Boss Blind'}</div>
                <div class="blind-name">${plan.blindName}</div>
                <div class="blind-effect">${plan.blindEffect}</div>
                <div class="blind-timing">Holds the final rites only — from the second shop to the end of the trial.</div>
            </div>
            <div class="ante-threshold-section">
                <div class="threshold-label">Score to Beat</div>
                <div class="threshold-value">${plan.scoreThreshold}</div>
            </div>
            <div class="ante-actions">
                <button class="ante-begin-button" id="anteBeginButton">
                    <span class="button-text">Begin Trial</span>
                    <span class="button-arrow">→</span>
                </button>
            </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        requestAnimationFrame(() => {
            overlay.style.transition = 'opacity 0.5s ease-out';
            overlay.style.opacity = '1';
        });
        const beginButton = modal.querySelector('#anteBeginButton');
        beginButton.addEventListener('click', () => {
            if (engine.sound) engine.sound.play('button', { volume: 0.5 });
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) document.body.removeChild(overlay);
                callback();
            }, 500);
        });
    },

    denyHold(state, index) {
        if (state.boons?.some((j) => j.id === 'reckless_abandon')) {
            return 'Reckless Abandon: You cannot hold dice!';
        }
        const blind = this.liveBlind(state);
        if (blind === 'no_held_dice') return 'Rolling Stones: You cannot hold dice.';
        if (!state.held?.[index]) {
            const maxHeld = blind === 'max_3_hold' ? 3 : (state.maxHeld || 5);
            const currentHeldCount = (state.held || []).filter(Boolean).length;
            if (currentHeldCount >= maxHeld) return `You can only hold ${maxHeld} dice.`;
        }
        return null;
    },

    blocksWorship(state) {
        return this.liveBlind(state) === 'no_worship';
    },

    blocksLibations(state) {
        return this.liveBlind(state) === 'no_consumables';
    },

    /** The Hook: unhold one random held die, then roll proceeds as normal. */
    applyHook(engine) {
        if (!engine?.state || this.liveBlind(engine.state) !== 'hook_yank') return 0;
        const held = engine.state.held;
        if (!Array.isArray(held)) return 0;
        const pool = [];
        for (let i = 0; i < held.length; i++) {
            if (held[i]) pool.push(i);
        }
        if (pool.length === 0) return 0;
        const pick = Math.floor(engine.prng.random() * pool.length);
        held[pool[pick]] = false;
        engine.showMessage?.('The Hook snatched a held die!');
        if (typeof Logger !== 'undefined') Logger.info('The Hook snatched a held die');
        return 1;
    },

    categoryRank(category) {
        return SCORE_LADDER.indexOf(category);
    },

    categoryLabel(category) {
        if (category === 'Yahtzee') return 'Heureka';
        return category || 'that offering';
    },

    denyScore(state, category) {
        if (this.liveBlind(state) !== SHOWDOWN_BLIND_ID) return null;
        if (!category) return null;
        const rank = this.categoryRank(category);
        if (rank < 0) return null;
        const floor = Number.isFinite(state.eyeFloorRank) ? state.eyeFloorRank : -1;
        if (rank < floor) {
            return `The Eye: offerings only move up. ${this.categoryLabel(category)} is behind you.`;
        }
        return null;
    },

    recordScore(state, category) {
        if (this.liveBlind(state) !== SHOWDOWN_BLIND_ID) return;
        const rank = this.categoryRank(category);
        if (rank < 0) return;
        const floor = Number.isFinite(state.eyeFloorRank) ? state.eyeFloorRank : -1;
        state.eyeFloorRank = Math.max(floor, rank);
    },
};

if (typeof window !== 'undefined') window.BlindDirector = BlindDirector;
