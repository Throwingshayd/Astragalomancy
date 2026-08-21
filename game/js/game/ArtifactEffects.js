/**
 * ArtifactEffects — the single place an owned artifact becomes a derived run stat.
 *
 * Every artifact is a pure contribution to an accumulator that restarts from the
 * GAME_BALANCE baseline on each call. That is the whole point of the shape: apply()
 * runs on purchase, on save load, and at the start of every trial, so any handler
 * that mutated run state cumulatively would silently compound. The old bronze_crown
 * handler did exactly that to baseFavour and would have paid out again every trial.
 *
 * Tiers: an upgrade is a second artifact the player owns *alongside* its base, never
 * a replacement — the shop stops offering the base once owned and offers the upgrade
 * instead. So upgraded entries contribute their own increment on top of the base
 * rather than an absolute value, and Temple Market plus Grand Agora is +2 wares.
 *
 * @module game/ArtifactEffects
 */

/* exported ArtifactEffects */
/* global GAME_BALANCE, ArtifactDice */

/**
 * id -> contribution. Additive only; nothing here may read the accumulator's own
 * result, so ownership order can never change the outcome.
 */
const ARTIFACT_CONTRIBUTIONS = {
    artifact_temple_market: (d) => { d.shopWares += 1; },
    artifact_grand_agora: (d) => { d.shopWares += 1; },

    artifact_clearance_sale: (d) => { d.shopDiscount += 0.25; },
    artifact_hermes_bargain: (d) => { d.shopDiscount += 0.25; },

    // Favour from worship levels is multiplied, so base doubles and the pair triples.
    artifact_telescope: (d) => { d.worshipFavourMult += 1; },
    artifact_hecatomb: (d) => { d.worshipFavourMult += 1; },

    artifact_hall_of_heroes: (d) => { d.packBonus.boon += 1; },
    artifact_antimatter: (d) => { d.boonSlots += 1; },

    artifact_panegyris: (d) => { d.packBonus.worship += 1; },
    artifact_the_auspices: (d) => { d.guaranteeTopWorship = true; },

    artifact_symposium: (d) => { d.packBonus.libation += 1; },
    artifact_ganymedes_cup: (d) => { d.guaranteeTopLibation = true; },

    artifact_sixth_astragalus: (d) => { d.extraDice += 1; },
    artifact_seventh_astragalus: (d) => { d.extraDice += 1; },

    // Money Tree: these move the ceiling on interest, never the amount earned.
    artifact_plutus_seed: (d) => { d.maxInterest += 5; },
    artifact_plutus_grove: (d) => { d.maxInterest += 10; },

    artifact_delphic_tithe: (d) => { d.rerollDiscount += 2; },
    artifact_pythias_indulgence: (d) => { d.rerollDiscount += 2; },

    artifact_tyches_grace: (d) => { d.extraRolls += 1; },
    artifact_tyches_bounty: (d) => { d.extraRolls += 1; },
};

const ArtifactEffects = {
    CONTRIBUTIONS: ARTIFACT_CONTRIBUTIONS,

    /** Run stats with no artifacts owned. */
    baseline() {
        const g = typeof GAME_BALANCE !== 'undefined' ? GAME_BALANCE : {};
        return {
            boonSlots: g.STARTING_BOON_SLOTS ?? 5,
            worshipSlots: g.STARTING_WORSHIP_SLOTS ?? 2,
            libationSlots: g.STARTING_LIBATION_SLOTS ?? 3,
            shopWares: 0,
            shopDiscount: 0,
            worshipFavourMult: 1,
            extraDice: 0,
            maxInterest: g.MAX_INTEREST ?? 5,
            rerollDiscount: 0,
            extraRolls: 0,
            packBonus: { boon: 0, worship: 0, libation: 0 },
            guaranteeTopWorship: false,
            guaranteeTopLibation: false,
        };
    },

    /** Baseline plus every owned artifact's contribution. Pure — does not touch state. */
    derive(state) {
        const derived = this.baseline();
        (state?.artifacts || []).forEach((artifact) => {
            const contribute = artifact && ARTIFACT_CONTRIBUTIONS[artifact.id];
            if (contribute) contribute(derived);
        });
        // A shop that pays you to buy is worse than no discount at all.
        derived.shopDiscount = Math.min(derived.shopDiscount, 0.9);
        return derived;
    },

    /** Write the derived stats onto the run state. Safe to call any number of times. */
    apply(state) {
        if (!state) return null;
        const d = this.derive(state);

        state.boonSlots = d.boonSlots;
        state.worshipSlots = d.worshipSlots;
        state.libationSlots = d.libationSlots;
        state.consumableSlots = d.worshipSlots + d.libationSlots;
        state.shopPriceMultiplier = 1 - d.shopDiscount;
        state.shopWareBonus = d.shopWares;
        state.worshipFavourMultiplier = d.worshipFavourMult;
        state.maxInterest = d.maxInterest;
        state.rerollDiscount = d.rerollDiscount;
        state.extraRolls = d.extraRolls;
        state.packBonus = d.packBonus;
        state.guaranteeTopWorship = d.guaranteeTopWorship;
        state.guaranteeTopLibation = d.guaranteeTopLibation;

        if (typeof ArtifactDice !== 'undefined') ArtifactDice.ensure(state);
        return d;
    },

    PACK_REVEAL_BASE: 3,

    /** How many cards a typed pack reveals. Chaos packs are not this path. */
    packRevealCount(state, type) {
        const extra = this.derive(state).packBonus[type] || 0;
        return this.PACK_REVEAL_BASE + extra;
    },

    highestWorshipGod(state) {
        const levels = state?.worshipLevels || {};
        let bestGod = null;
        let best = 0;
        Object.keys(levels).forEach((god) => {
            const n = levels[god] || 0;
            if (n > best) {
                best = n;
                bestGod = god;
            }
        });
        return best > 0 ? bestGod : null;
    },

    mostPouredLibationId(state) {
        const pours = state?.libationPours || {};
        let bestId = null;
        let best = 0;
        Object.keys(pours).forEach((id) => {
            const n = pours[id] || 0;
            if (n > best) {
                best = n;
                bestId = id;
            }
        });
        return best > 0 ? bestId : null;
    },

    noteLibationPour(state, libationId) {
        if (!state || !libationId) return;
        if (!state.libationPours || typeof state.libationPours !== 'object') state.libationPours = {};
        state.libationPours[libationId] = (state.libationPours[libationId] || 0) + 1;
    },

    /**
     * Telescope-style: the card for your most-used god / most-poured drink, if it is in
     * the already-filtered pack pool. Null when you have no history or it cannot appear.
     */
    guaranteedPackCard(state, type, pool) {
        const d = this.derive(state);
        const list = Array.isArray(pool) ? pool : [];
        if (type === 'worship' && d.guaranteeTopWorship) {
            const god = this.highestWorshipGod(state);
            return god ? list.find((c) => c && c.god === god) || null : null;
        }
        if (type === 'libation' && d.guaranteeTopLibation) {
            const id = this.mostPouredLibationId(state);
            return id ? list.find((c) => c && c.id === id) || null : null;
        }
        return null;
    },

    /** Reroll can reach 0 — that is what Pythia's Indulgence buys. */
    rerollCost(state) {
        const base = (typeof GAME_BALANCE !== 'undefined' && GAME_BALANCE.SHOP_REROLL_COST) || 4;
        return Math.max(0, base - (state?.rerollDiscount ?? 0));
    },

    rollsPerTurn(state) {
        const base = (typeof GAME_BALANCE !== 'undefined' && GAME_BALANCE.STARTING_ROLLS) || 3;
        return base + (state?.extraRolls ?? 0);
    },

    maxInterest(state) {
        const base = (typeof GAME_BALANCE !== 'undefined' && GAME_BALANCE.MAX_INTEREST) || 5;
        return state?.maxInterest ?? base;
    },

    /** Favour earned from worship levels, scaled by the Altar line. */
    worshipFavourMultiplier(state) {
        return state?.worshipFavourMultiplier ?? 1;
    },
};

if (typeof window !== 'undefined') window.ArtifactEffects = ArtifactEffects;
