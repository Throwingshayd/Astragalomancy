/* exported DieScoreContribution */
/**
 * Single place for when-scored die extras (Clockwork, Pearl, Mirror, Gold).
 * ScoringEngine, scoring popups, and die hover all read from here.
 */
const DieScoreContribution = {
    _bonuses() {
        if (typeof ENHANCEMENT_BONUSES !== 'undefined') return ENHANCEMENT_BONUSES;
        return globalThis.ENHANCEMENT_BONUSES || { IRON_PIPS: 5, GOLD_COINS: 1, BLESSED_FAVOUR: 10 };
    },

    _ironAmount() {
        return this._bonuses().IRON_PIPS;
    },

    _goldAmount() {
        return this._bonuses().GOLD_COINS;
    },

    has(die, id) {
        return typeof die?.hasEnhancementForCurrentFace === 'function'
            && die.hasEnhancementForCurrentFace(id);
    },

    ironPips(die) {
        return this.has(die, 'iron') ? this._ironAmount() : 0;
    },

    pearlPips(die) {
        if (!this.has(die, 'mother_of_pearl') || die.motherOfPearlBonus == null) return 0;
        const n = Number(die.motherOfPearlBonus);
        return Number.isFinite(n) ? n : 0;
    },

    gold(die) {
        return this.has(die, 'gold') ? this._goldAmount() : 0;
    },

    _blessedAmount() {
        return this._bonuses().BLESSED_FAVOUR ?? 10;
    },

    blessedFavour(die) {
        return this.has(die, 'blessed') ? this._blessedAmount() : 0;
    },

    _chances() {
        if (typeof ENHANCEMENT_CHANCES !== 'undefined') return ENHANCEMENT_CHANCES;
        return globalThis.ENHANCEMENT_CHANCES || {
            PARCHMENT_GOLD_CHANCE: 0.15,
            PARCHMENT_FAVOUR_CHANCE: 0.25,
        };
    },

    /**
     * One parchment fortune per die. Gold (15%) and Favour (25%) are independent,
     * matching calculateScore — animation must display this result, not roll again.
     * @param {{ random: () => number }} prng
     * @returns {{ gold: number, favour: number }}
     */
    parchmentOutcome(prng) {
        const chances = this._chances();
        const bonuses = this._bonuses();
        const gold = prng.random() < chances.PARCHMENT_GOLD_CHANCE
            ? (bonuses.PARCHMENT_GOLD ?? 5)
            : 0;
        const favour = prng.random() < chances.PARCHMENT_FAVOUR_CHANCE
            ? (bonuses.PARCHMENT_FAVOUR ?? 100)
            : 0;
        return { gold, favour };
    },

    resolveParchment(dice, prng) {
        const fortunes = [];
        (dice || []).forEach((die, dieIndex) => {
            if (!this.has(die, 'parchment')) return;
            fortunes.push({ dieIndex, ...this.parchmentOutcome(prng) });
        });
        return fortunes;
    },

    categoryNumber(category) {
        const map = (typeof CATEGORY_TO_NUMBER !== 'undefined')
            ? CATEGORY_TO_NUMBER
            : globalThis.CATEGORY_TO_NUMBER;
        return map?.[category] || null;
    },

    contributes(face, category) {
        const num = this.categoryNumber(category);
        if (num) return face === num;
        return face > 0;
    },

    alwaysOnPips(die) {
        return this.ironPips(die) + this.pearlPips(die);
    },

    mirrorExtraPips(die, face, category) {
        if (!this.has(die, 'mirror')) return 0;
        if (category != null && !this.contributes(face, category)) return 0;
        if (!(face > 0)) return 0;
        return face + this.ironPips(die) + this.pearlPips(die);
    },

    scoredEnhancementPips(die, face, category) {
        return this.alwaysOnPips(die) + this.mirrorExtraPips(die, face, category);
    },

    /**
     * @param {Object} die
     * @param {string} [category] scored row; omit for hover (treat as a matching row)
     * @returns {{ face: number, pips: number, gold: number, favour: number }}
     */
    preview(die, category) {
        const face = typeof die?.getEffectiveFace === 'function' ? die.getEffectiveFace() : 0;
        const gold = this.gold(die);
        const favour = this.blessedFavour(die);
        if (category != null) {
            const facePips = this.contributes(face, category) ? face : 0;
            return {
                face,
                pips: facePips + this.scoredEnhancementPips(die, face, category),
                gold,
                favour,
            };
        }
        const pips = face > 0
            ? face + this.alwaysOnPips(die) + this.mirrorExtraPips(die, face, null)
            : 0;
        return { face, pips, gold, favour };
    },

    faceHas(die, faceKey, id) {
        const enh = die?.faces?.[faceKey]?.enhancements;
        if (!enh) return false;
        if (typeof enh.has === 'function') return enh.has(id);
        return Array.from(enh).includes(id);
    },

    /**
     * Hover preview for one printed face (inspect tray), not the face that is up.
     * @returns {{ face: number, pips: number, gold: number, favour: number }}
     */
    previewFace(die, faceKey) {
        const data = die?.faces?.[faceKey];
        const shown = Number(data?.modifiedValue ?? data?.value ?? faceKey);
        const face = Number.isFinite(shown) && shown > 0 ? shown : 0;
        const iron = this.faceHas(die, faceKey, 'iron') ? this._ironAmount() : 0;
        const gold = this.faceHas(die, faceKey, 'gold') ? this._goldAmount() : 0;
        const favour = this.faceHas(die, faceKey, 'blessed') ? this._blessedAmount() : 0;
        const pips = face > 0
            ? face + iron + (this.faceHas(die, faceKey, 'mirror') ? face + iron : 0)
            : 0;
        return { face, pips, gold, favour };
    },
};

if (typeof window !== 'undefined') window.DieScoreContribution = DieScoreContribution;
