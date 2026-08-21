/**
 * ScoringEngine - Orchestrates scoring math (HandEvaluator + context)
 * Balatro-grade pipeline: Hand -> Base Stats -> Blessings (Dice -> Hand -> Inventory)
 * Single entry point for category evaluation. UI and GameEngine only READ from here.
 * @module ScoringEngine
 */

// GOD_TO_CATEGORY from GameConstants.js (loaded before this script)
// Maps score category → god for worship/favour lookups

const PHASE_ORDER = ['dice', 'hand', 'inventory'];
const resolveDieFace = (die, fallback = 0) => (
    typeof DieFaceUtils !== 'undefined'
        ? DieFaceUtils.resolveFace(die, fallback)
        : (typeof die?.getEffectiveFace === 'function' ? die.getEffectiveFace() : (die?.face ?? die?.currentFace ?? fallback))
);

const ScoringEngine = {
    /**
     * Fast precondition check before runPipeline / preview.
     * @returns {{ ok: true }|{ ok: false, reason: string }}
     */
    validateRun(state, category) {
        if (!category || typeof category !== 'string') return { ok: false, reason: 'category' };
        if (!state) return { ok: false, reason: 'state' };
        if (!Array.isArray(state.dice)) return { ok: false, reason: 'dice' };
        const expected = typeof GAME_BALANCE !== 'undefined' ? GAME_BALANCE.STARTING_DICE_COUNT : 5;
        if (state.dice.length !== expected) return { ok: false, reason: 'dice_count' };
        for (let i = 0; i < state.dice.length; i++) {
            const die = state.dice[i];
            if (!die || typeof die.getEffectiveFace !== 'function') return { ok: false, reason: 'die_shape' };
        }
        if (['Sevens', 'Eights', 'Nines'].includes(category) && !state.unlockedCategories?.[category]) {
            return { ok: false, reason: 'locked' };
        }
        if (typeof DevotionUtils !== 'undefined' && !DevotionUtils.canScoreCategory(state, category)) {
            return { ok: false, reason: 'devotion_full' };
        }
        if (typeof BlindDirector !== 'undefined' && BlindDirector.denyScore(state, category)) {
            return { ok: false, reason: 'blind_eye' };
        }
        return { ok: true };
    },

    /**
     * Build scoring context from game state
     * @param {Object} state - Game state
     * @returns {{ pipsBonuses: Object, boons: Object[], activeBlind: string|null, unlockedCategories: Object }}
     */
    buildContext(state) {
        return {
            pipsBonuses: state.pipsBonuses || {},
            boons: state.boons || [],
            // Only the boss segment's blind reaches the evaluator; earlier segments score clean.
            activeBlind: (typeof BlindDirector !== 'undefined'
                ? BlindDirector.liveBlind(state)
                : state.activeBlind) || null,
            unlockedCategories: state.unlockedCategories || {}
        };
    },

    /**
     * Evaluate a category - pure logic, no side effects
     * @param {string} category
     * @param {number[]} faces
     * @param {Object} counts - value -> count
     * @param {Object} context - from buildContext(state)
     * @returns {{ pips: number, isValid: boolean }}
     */
    evaluateCategory(category, faces, counts, context) {
        if (typeof HandEvaluator === 'undefined') {
            if (typeof Logger !== 'undefined') Logger.error('ScoringEngine: HandEvaluator not loaded');
            return { pips: 0, isValid: false };
        }
        return HandEvaluator.evaluate(category, faces, counts, context);
    },

    /**
     * Run full scoring pipeline: Hand -> Base -> Blessings (phased)
     * @param {string} category
     * @param {Object} gameState
     * @param {Object} [options] - { tempPips, tempFavour, applyGlobalBonuses }
     * @returns {{ pips: number, favour: number, finalScore: number, isValid: boolean }}
     */
    runPipeline(category, gameState, options = {}) {
        const state = gameState;
        const { tempPips = 0, tempFavour = 0, applyGlobalBonuses = true } = options;

        if (!state || !state.dice || state.dice.length === 0) {
            return { pips: 0, favour: 1, finalScore: 0, isValid: false };
        }

        const diceSubstitutions = state.diceSubstitutions || {};
        const faces = state.dice.map((d) => {
            let face = resolveDieFace(d, 0);
            if (typeof face !== 'number' || isNaN(face)) face = 0;
            if (diceSubstitutions.foursAsFives && face === 4) face = 5;
            return face;
        });
        const counts = {};
        faces.forEach((val) => {
            if (val > 0) counts[val] = (counts[val] || 0) + 1;
        });

        const context = this.buildContext(state);
        const evalCategory = typeof DevotionUtils !== 'undefined'
            ? DevotionUtils.getEvalCategory(state, category)
            : category;
        const { pips: basePips, isValid } = this.evaluateCategory(evalCategory, faces, counts, context);

        let favour = 1;
        const god = typeof DevotionUtils !== 'undefined'
            ? DevotionUtils.getGodForCategory(state, category)
            : GOD_TO_CATEGORY[category];
        const pipCategory = typeof DevotionUtils !== 'undefined'
            ? DevotionUtils.getPipCategory(state, category)
            : category;
        // Worship bonus (pips + mult) only applies on non-zero dice entries; boons apply even on scratch
        const hasValidDiceScore = basePips > 0;
        if (hasValidDiceScore) {
            if (god && state.worshipLevels && state.worshipLevels[god]) {
                const perLevel = typeof WORSHIP_FAVOUR_PER_LEVEL !== 'undefined' ? WORSHIP_FAVOUR_PER_LEVEL : 0.25;
                favour += state.worshipLevels[god] * perLevel;
            }
        }

        let pips = basePips + tempPips;
        favour += tempFavour;

        // Balatro-style: add pips per worship level — only on non-zero dice score
        if (hasValidDiceScore) {
            const worshipLevel = (god && state.worshipLevels && state.worshipLevels[god]) ? state.worshipLevels[god] : 0;
            const pipsPerLevel = (typeof CATEGORY_PIPS_PER_LEVEL !== 'undefined' && CATEGORY_PIPS_PER_LEVEL[pipCategory]) || 0;
            pips += worshipLevel * pipsPerLevel;
        }

        if (isValid && state.dice) {
            const upperSection = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines'];
            state.dice.forEach((die, i) => {
                if (die && die.hasEnhancementForCurrentFace) {
                    if (die.hasEnhancementForCurrentFace('iron')) {
                        pips += (typeof ENHANCEMENT_BONUSES !== 'undefined' ? ENHANCEMENT_BONUSES.IRON_PIPS : 5);
                    }
                    if (die.hasEnhancementForCurrentFace('mother_of_pearl') && die.motherOfPearlBonus !== undefined) {
                        pips += die.motherOfPearlBonus;
                    }
                    // Mirror (Balatro Red Seal): die scores twice, including enhancements
                    if (die.hasEnhancementForCurrentFace('mirror')) {
                        const faceVal = faces[i] || 0;
                        const contributes = !upperSection.includes(category) ||
                            (typeof CATEGORY_TO_NUMBER !== 'undefined' && faceVal === CATEGORY_TO_NUMBER[category]);
                        if (contributes) {
                            pips += faceVal;
                            if (die.hasEnhancementForCurrentFace('iron')) {
                                pips += (typeof ENHANCEMENT_BONUSES !== 'undefined' ? ENHANCEMENT_BONUSES.IRON_PIPS : 5);
                            }
                            if (die.hasEnhancementForCurrentFace('mother_of_pearl') && die.motherOfPearlBonus !== undefined) {
                                pips += die.motherOfPearlBonus;
                            }
                        }
                    }
                    // Wild: getEffectiveFace() already returns wildValue, so basePips includes it - no extra pips
                }
            });
        }

        // Single Balatro-style pipeline: pips (chips) × favour (mult).
        // Boons add pips, add favour (+mult), or multiply favour (×mult) in phase order.
        let eventData = { category, pips, favour, isValid };
        const boons = state.boons || [];

        PHASE_ORDER.forEach((phase) => {
            boons.forEach((j) => {
                const jPhase = j.triggerPhase ?? 'hand';
                if (jPhase !== phase) return;
                if (j.timing && j.timing.before_score && typeof j.onTimingEvent === 'function') {
                    eventData = j.onTimingEvent('before_score', state, eventData);
                }
            });
        });

        pips = Math.max(0, eventData.pips ?? pips);
        favour = Math.max(0.1, eventData.favour ?? favour);

        if (applyGlobalBonuses && state.globalBonuses && state.globalBonuses.fivesToAll && state.dice) {
            const fivesCount = state.dice.filter((d) => resolveDieFace(d, 0) === 5).length;
            pips += fivesCount * 5;
        }

        // Naneinf guard: a runaway boon stack must never surface NaN/Infinity in the reveal
        // or silently collapse the final score to 0. Clamp to a finite safe range — NaN →
        // neutral, +Infinity/overflow → MAX — while keeping favour's 0.1 floor.
        const MAX = (typeof SafeMath !== 'undefined') ? SafeMath.MAX_SAFE_INT : Number.MAX_SAFE_INTEGER;
        const clampFinite = (v, floor, nanFallback) => {
            const n = Number(v);
            if (Number.isNaN(n)) return nanFallback;
            if (n >= MAX) return MAX;
            return Math.max(floor, n);
        };
        pips = clampFinite(pips, 0, 0);
        favour = clampFinite(favour, 0.1, 1);

        const finalScore = typeof SafeMath !== 'undefined'
            ? SafeMath.safeMultiply(pips, favour)
            : Math.max(0, Math.min(Math.floor(pips * favour), MAX));

        return {
            pips,
            favour,
            finalScore,
            isValid
        };
    }
};

if (typeof window !== 'undefined') window.ScoringEngine = ScoringEngine;
