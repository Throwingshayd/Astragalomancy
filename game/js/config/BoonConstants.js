/**
 * Boon-Specific Constants
 * All magic numbers for boon effects in one place for easy balancing
 * @module BoonConstants
 */

const BOON_EFFECTS = {
    // === EPIC TIER BOONS ===
    SISYPHUS_BOULDER: {
        PIPS_PER_REROLL: 5
    },
    
    KRONOS_HOURGLASS: {
        BONUS_ROLLS: 1  // Deterministic +1 roll each turn (was random 1-5, felt swingy)
    },
    
    PANDORAS_JAR: {
        DESTROY_INTERVAL: 3,  // Every 3rd turn
        FAVOUR_BONUS: 4
    },
    
    THE_FATES_LOOM: {
        CONSECUTIVE_FAVOUR: 3  // Instead of normal 2
    },
    
    THE_PANTHEON: {
        FAVOUR_PER_GOD: 0.5
    },
    
    PARMENIDES_DIE: {
        // Pantheon swap: upper ↔ lower by position (Ones↔3oK, Twos↔Small Straight, etc.)
        SWAP_MAP: {
            'Ones': 'Three of a Kind', 'Three of a Kind': 'Ones',
            'Twos': 'Small Straight', 'Small Straight': 'Twos',
            'Threes': 'Full House', 'Full House': 'Threes',
            'Fours': 'Four of a Kind', 'Four of a Kind': 'Fours',
            'Fives': 'Large Straight', 'Large Straight': 'Fives',
            'Sixes': 'Chance', 'Chance': 'Sixes',
            'Sevens': 'Yahtzee', 'Yahtzee': 'Sevens'
        }
    },
    
    ASCETICS_VOW: {
        FAVOUR_PER_EMPTY_SLOT: 1
    },
    
    BELLOWS_OF_WAR: {
        VIRTUAL_DIE_COUNT: 1  // Three of Kind → Four of Kind
    },
    
    CARILLON_OF_THE_MUSES: {
        ALL_ENHANCED_FAVOUR: 3,
        SECRET_SAME_FAVOUR: 5
    },
    
    REFLECTION_OF_NARCISSUS: {
        ROLL_PENALTY: 2,
        EFFECT_MULTIPLIER: 2  // All boons trigger twice
    },
    
    // === VIBRANT TIER BOONS ===
    HESTIAS_HEARTH: {
        ALL_ODD_EVEN_FAVOUR: 3
    },
    
    DEMETERS_HARVEST: {
        DIE_FACE_INCREASE: 1,
        MAX_DIE_VALUE: 9
    },
    
    MEDUSAS_GAZE: {
        AUTO_HOLD_VALUE: 6,
        LOWER_SANCTUM_FAVOUR: 0.5
    },
    
    HYDRAS_HEADS: {
        TWO_DICE_FAVOUR: 3
    },
    
    TANTALUS_CURSE: {
        FAVOUR_PER_GOLD: 0.5
    },
    
    PEGASUS_FLIGHT: {
        HIGH_DIE_THRESHOLD: 6,
        FAVOUR_PER_HIGH_DIE: 0.5
    },
    
    CERBERUS_WATCH: {
        HELD_DICE_COUNT: 3,
        PIPS_PER_HELD: 3
    },
    
    ORPHEUS_LYRE: {
        REPEAT_FAVOUR_BONUS: 2
    },
    
    TROJAN_HORSE: {
        ACTIVATION_TURN: 10,
        MULTIPLIER: 2
    },
    
    THE_SYMPOSIUM: {
        FOUR_OF_KIND_FAVOUR: 1
    },
    
    GOLDEN_TOUCH: {
        INTEREST_RATE: 3  // 1 gold per 3 saved (instead of 5)
    },
    
    DOUBLING_SEASON: {
        // Even numbers doubled, odd numbers -1 (except 1)
        ODD_PENALTY: -1
    },
    
    SYMMETRY: {
        PALINDROME_FAVOUR_GAIN: 0.5  // Stacks permanently
    },
    
    MISERY: {
        ZERO_GOLD_FAVOUR: 2
    },
    
    SMOG_OF_MORPHEUS: {
        TRANSFORM_TO: 3,  // 2s and 4s → 3s
        TARGET_VALUES: [2, 4]
    },
    
    MORTAL_VINEYARD: {
        // Selling boon → random libation
    },
    
    PROTEUS_DISGUISE: {
        // Mimics random boon each turn
    },
    
    CORNUCOPIA_OF_PLOUTOS: {
        ANTE_END_GOLD_MULTIPLIER: 1.5
    },
    
    THE_ODYSSEY: {
        ALL_CATEGORIES_BONUS: 500
    },
    
    MESSAGE_IN_A_BOTTLE: {
        SOLO_ANTE_BONUS: 0.5  // 50% of threshold
    },

    THE_ZEALOT: {
        WORSHIP_MATCH_FAVOUR: 1
    },
    
    BETRAYAL_BY_PARIS: {
        GOLD_REWARD: 10
    },
    
    ERUPTION_OF_ETNA: {
        MIN_BOONS_FOR_TRIGGER: 3,
        FAVOUR_PER_ERUPTION: 1  // Stacks
    },
    
    CYCLE_OF_SEASONS: {
        WORSHIP_SPREAD_FAVOUR: 1
    },
    
    GOLD_STANDARD: {
        RICH_THRESHOLD: 20,  // Gold needed to stay "on the gold standard"
        FAVOUR_MULT: 1.5     // ×Favour while rich
    },
    
    // === RUSTIC TIER BOONS ===
    ACHILLES_HEEL: {
        PIPS_BONUS: 15,
        GOLD_COST_PER_TURN: 1
    },
    
    MIDAS_TOUCH: {
        FAVOUR_PER_5_GOLD: 0.1  // Hoard payoff: +0.1 Favour per 5 gold held when scoring
    },
    
    ICARUS_WINGS: {
        PIPS_PER_UNUSED_ROLL: 15,
        BREAK_CHANCE: 1/8
    },
    
    LETHE_WATERS: {
        LOW_DIE_THRESHOLD: 2,
        PIPS_BONUS: 25
    },
    
    FORGE_OF_HEPHAESTUS: {
        FAVOUR_PER_UNUSED_ROLL: 0.5,
        MAX_FAVOUR: 1.5
    },
    
    PROMETHEUS_GIFT: {
        FAVOUR_BONUS: 3,
        ROLL_PENALTY: 1
    },
    
    CHAOS_PRIMORDIAL: {
        FAVOUR_MULTIPLIER: 1.5,
        RANDOM_PIPS_MIN: 1,
        RANDOM_PIPS_MAX: 40
    },
    
    CHARONS_FERRY_FARE: {
        GOLD_PER_SCORE: 1
    },
    
    LUCKY_DICE_BAG: {
        REROLL_VALUE: 1  // Rerolls 1s
    },
    
    WEIGHTED_DICE: {
        PIPS_PER_DIE: 1
    },
    
    PHILOSOPHERS_STONE: {
        FAVOUR_TO_GOLD_RATIO: 3  // 3 favour → 1 gold
    },
    
    GAMBLERS_CHARM: {
        WIN_GOLD: 2,
        LOSE_GOLD: 1,
        WIN_CHANCE: 0.5
    },
    
    MARATHON_RUNNER: {
        PIPS_PER_ROLL: 1,
        DESTRUCTION_THRESHOLD: 42,  // Marathon km!
        MAX_SCRATCHES: 3
    },
    
    MATHEMATICIANS_COMPASS: {
        STRAIGHT_FAVOUR: 2  // Small/Large Straights (consecutive sequences) gain +2 Favour
    },
    
    PRIME_TIME: {
        FAVOUR_PER_PRIME: 0.3,  // Each die showing a prime grants +0.3 Favour
        PRIMES: [2, 3, 5]  // 7 added when Sevens is unlocked
    },
    
    THE_LOCKSMITH: {
        PIPS_PER_ROLL_HELD: 1
    },
    
    THE_MERCHANT: {
        EXTRA_SELL_GOLD: 1
    },
    
    THE_HERETIC: {
        PIPS_PER_TURN: 2  // Stacks
    },
    
    RECKLESS_ABANDON: {
        FAVOUR_MULT: 2  // Score with no dice held → ×2 Favour (a choice, not a forced lock)
    },
    
    TYPHON: {
        FAVOUR_PER_ONE: 0.5  // Each die showing a 1 when scoring grants +0.5 Favour
    },
    
    EARLY_BIRD: {
        EARLY_PIPS: 20,      // Turns 1-3
        MID_GOLD: 2,         // Turns 4-5
        LATE_PENALTY: -5     // Turns 6-13
    },
    
    ASSEMBLY_OF_HEROES: {
        FULL_SLOTS_BONUS: 15
    },
    
    DIVINE_SYNERGY: {
        PIPS_PER_MATCHING_RARITY: 5
    },
    
    FIRST_BLOOD: {
        FIRST_SCORE_BONUS: 50
    },
    
    MIDNIGHT_OIL: {
        LATE_GAME_TURN: 12,
        PIPS_BONUS: 24,
        ROLL_PENALTY: 1
    },
    
    NYXIAN_SEDUCTION: {
        CHANCE_PIPS: 69,
        MALE_GOD_PREFERENCE: 0.75,  // 75% chance to target male gods
        WORSHIP_REDUCTION: 1
    },
    
    JOURNEY_OF_PERSEUS: {
        PIPS_PER_100_SCORE: 10,
        SCORE_THRESHOLD: 100
    }
};

/**
 * God → Category Mapping (from GOD_METADATA in GameConstants)
 * Use GodUtils.getCategory(god) when available.
 */
const GOD_CATEGORY_MAP = typeof GOD_METADATA !== 'undefined'
    ? Object.fromEntries(
        Object.entries(GOD_METADATA).map(([god, data]) => [god, data.category])
    )
    : {};

/**
 * Lower Sanctum Categories (for Medusa's Gaze, etc.)
 */
const LOWER_SANCTUM_CATEGORIES = [
    'Three of a Kind',
    'Four of a Kind',
    'Full House',
    'Small Straight',
    'Large Straight',
    'Yahtzee',
    'Chance'
];

/**
 * Upper Sanctum Categories
 */
const UPPER_SANCTUM_CATEGORIES = [
    'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes'
];

/**
 * All Base Categories (before 7s/8s/9s unlock)
 */
const BASE_CATEGORIES = [...UPPER_SANCTUM_CATEGORIES, ...LOWER_SANCTUM_CATEGORIES];

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BOON_EFFECTS,
        GOD_CATEGORY_MAP,
        LOWER_SANCTUM_CATEGORIES,
        UPPER_SANCTUM_CATEGORIES,
        BASE_CATEGORIES
    };
}

