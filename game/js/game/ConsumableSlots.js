/**
 * Typed capacity for the two consumable rails: blessings (worship) on the left
 * pillar, libations on the rail beside the hourglass.
 *
 * `state.consumables` stays a single array holding both kinds — save/load, boss
 * blinds and boon effects all iterate it — but the two kinds no longer compete
 * for slots. Worship is capped by `state.worshipSlots`, libations by
 * `state.libationSlots`, and `state.consumableSlots` is kept as their sum for
 * anything that still wants the combined total.
 *
 * @module game/ConsumableSlots
 */

/* exported ConsumableSlots */
/* global WorshipCard, LibationCard, GAME_BALANCE */

const ConsumableSlots = {
    /**
     * @param {Object} card
     * @returns {'worship'|'libation'|null} null for anything that is not a consumable
     */
    kindOf(card) {
        if (!card) return null;
        if (typeof WorshipCard !== 'undefined' && card instanceof WorshipCard) return 'worship';
        if (typeof LibationCard !== 'undefined' && card instanceof LibationCard) return 'libation';
        // Plain data (save restore, tests) carries the same discriminator as Card.type.
        if (card.type === 'worship' || card.rarity === 'worship') return 'worship';
        if (card.type === 'libation' || card.rarity === 'libation') return 'libation';
        return null;
    },

    /** Cards of one kind, in run order. */
    held(state, kind) {
        return (state?.consumables || []).filter((c) => this.kindOf(c) === kind);
    },

    capacity(state, kind) {
        const balance = typeof GAME_BALANCE !== 'undefined' ? GAME_BALANCE : null;
        if (kind === 'worship') {
            return state?.worshipSlots ?? balance?.STARTING_WORSHIP_SLOTS ?? 2;
        }
        if (kind === 'libation') {
            return state?.libationSlots ?? balance?.STARTING_LIBATION_SLOTS ?? 3;
        }
        return 0;
    },

    hasRoom(state, kind) {
        return this.held(state, kind).length < this.capacity(state, kind);
    },

    /** True when this card's own rail is full — a libation never blocks a blessing. */
    isFull(state, card) {
        const kind = this.kindOf(card);
        return kind ? !this.hasRoom(state, kind) : false;
    },

    /** Expulsion offers only the rail the incoming card would land on. */
    sameKindAs(state, card) {
        return this.held(state, this.kindOf(card));
    },
};

if (typeof window !== 'undefined') window.ConsumableSlots = ConsumableSlots;
