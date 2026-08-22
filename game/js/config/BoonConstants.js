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
        BONUS_ROLLS: 2,
        SCORE_PENALTY: 0.8  // 20% reduction
    },
    
    PANDORAS_JAR: {
        DESTROY_INTERVAL: 3,  // Every 3rd turn
        FAVOUR_BONUS: 200
    },
    
    THE_FATES_LOOM: {
        CONSECUTIVE_FAVOUR: 3  // Instead of normal 2
    },
    
    THE_PANTHEON: {
        FAVOUR_PER_GOD: 50
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
        FAVOUR_PER_EMPTY_SLOT: 100
    },
    
    BELLOWS_OF_WAR: {
        VIRTUAL_DIE_COUNT: 1  // Three of Kind → Four of Kind
    },
    
    CARILLON_OF_THE_MUSES: {
        ALL_ENHANCED_FAVOUR: 300,
        SECRET_SAME_FAVOUR: 5
    },
    
    REFLECTION_OF_NARCISSUS: {
        ROLL_PENALTY: 2,
        EFFECT_MULTIPLIER: 2  // All boons trigger twice
    },
    
    // === VIBRANT TIER BOONS ===
    HESTIAS_HEARTH: {
        ALL_ODD_EVEN_FAVOUR: 300
    },
    
    DEMETERS_HARVEST: {
        DIE_FACE_INCREASE: 1,
        MAX_DIE_VALUE: 9
    },
    
    MEDUSAS_GAZE: {
        AUTO_HOLD_VALUE: 6,
        LOWER_SANCTUM_FAVOUR: 50
    },
    
    HYDRAS_HEADS: {
        TWO_DICE_FAVOUR: 300
    },
    
    TANTALUS_CURSE: {
        FAVOUR_PER_GOLD: 10
    },
    
    PEGASUS_FLIGHT: {
        HIGH_DIE_THRESHOLD: 6,
        FAVOUR_PER_HIGH_DIE: 50
    },
    
    CERBERUS_WATCH: {
        HELD_DICE_COUNT: 3,
        PIPS_PER_HELD: 3
    },
    
    ORPHEUS_LYRE: {
        REPEAT_FAVOUR_BONUS: 200
    },
    
    TROJAN_HORSE: {
        ACTIVATION_TURN: 10,
        MULTIPLIER: 2
    },
    
    THE_SYMPOSIUM: {
        FOUR_OF_KIND_FAVOUR: 5
    },
    
    GOLDEN_TOUCH: {
        INTEREST_RATE: 3  // 1 gold per 3 saved (instead of 5)
    },
    
    DOUBLING_SEASON: {
        // Even numbers doubled, odd numbers -1 (except 1)
        ODD_PENALTY: -1
    },
    
    SYMMETRY: {
        PALINDROME_FAVOUR_GAIN: 50  // Stacks permanently
    },
    
    MISERY: {
        ZERO_GOLD_FAVOUR: 200
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
        WORSHIP_MATCH_FAVOUR: 100
    },
    
    BETRAYAL_BY_PARIS: {
        GOLD_REWARD: 10
    },
    
    ERUPTION_OF_ETNA: {
        MIN_BOONS_FOR_TRIGGER: 3,
        FAVOUR_PER_ERUPTION: 100  // Stacks
    },
    
    CYCLE_OF_SEASONS: {
        WORSHIP_SPREAD_FAVOUR: 1
    },
    
    GOLD_STANDARD: {
        PIPS_PER_GOLD_ENHANCEMENT: 3
    },
    
    // === RUSTIC TIER BOONS ===
    ACHILLES_HEEL: {
        PIPS_BONUS: 15,
        GOLD_COST_PER_TURN: 1
    },
    
    MIDAS_TOUCH: {
        PIPS_PER_10_GOLD: 5
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
        FAVOUR_PER_UNUSED_ROLL: 50,
        MAX_FAVOUR: 150
    },
    
    PROMETHEUS_GIFT: {
        FAVOUR_BONUS: 300,
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
        FAVOUR_TO_GOLD_RATIO: 300  // 300 Favour → 1 gold
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
        EVEN_SUM_BONUS: 10
    },
    
    PRIME_TIME: {
        PIPS_PER_PRIME: 1,
        PRIMES: [2, 3, 5, 7]  // 7 only if unlocked
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
        PIPS_BONUS: 50
    },
    
    TYPHON: {
        THRESHOLD_PERCENTAGE: 0.9,  // 90% of threshold
        TRIGGER_VALUE: 1,  // All 1s on first roll
        PROBABILITY: 1/7776  // (1/6)^5
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
        SCORE_THRESHOLD: 10000
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

