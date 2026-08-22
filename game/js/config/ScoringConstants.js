/**
 * Scoring System Constants
 * All scoring-related magic numbers for game balance
 * @module ScoringConstants
 */

/**
 * Base scores for special hands
 * @const {Object}
 */
const BASE_SCORES = {
    SMALL_STRAIGHT: 30,
    LARGE_STRAIGHT: 40,
    YAHTZEE: 50,  // Heureka
};

/**
 * Bonus points added to lower section categories
 * These reward scoring in the lower section
 * @const {Object}
 */
const LOWER_SECTION_BONUSES = {
    'Three of a Kind': 15,
    'Small Straight': 20,
    'Full House': 25,
    'Four of a Kind': 30,
    'Large Straight': 40,
    'Yahtzee': 50,
    'Chance': 0,
};

/**
 * Favour is stored as hundredths so the engine stays on integers:
 * 100 = player ×1, worship +25 = +0.25. Score = Pips × (Favour / 100).
 * +Favour adds; ×Favour multiplies.
 */
const BASE_FAVOUR = 100;
const FAVOUR_FLOOR = 10;

/**
 * Favour added per worship level when scoring that god's category (offered on pantheon).
 */
const WORSHIP_FAVOUR_PER_LEVEL = 25;

/** Default times each pantheon row may be scored per trial. */
const DEVOTION_BASE_CAPACITY = 1;

/** Trials a worship card must be held to become Ascended Devotion. */
const DEVOTION_TRIALS_TO_ASCEND = 3;

/**
 * Pips added per worship level when scoring that category.
 * Upper (Ones–Nines): face value per level. Lower: half of LOWER_SECTION_BONUSES (floor).
 */
const CATEGORY_PIPS_PER_LEVEL = {
    'Ones': 1, 'Twos': 2, 'Threes': 3, 'Fours': 4, 'Fives': 5, 'Sixes': 6,
    'Sevens': 7, 'Eights': 8, 'Nines': 9,
    'Three of a Kind': 7,
    'Small Straight': 10,
    'Full House': 12,
    'Four of a Kind': 15,
    'Large Straight': 20,
    'Yahtzee': 25,
    'Chance': 0
};

/**
 * Thresholds for scoring categories
 * @const {Object}
 */
const SCORING_THRESHOLDS = {
    YAHTZEE_REQUIRED: 5,        // 5 of a kind
    FOUR_OF_KIND_REQUIRED: 4,
    THREE_OF_KIND_REQUIRED: 3,
    FULL_HOUSE_THREE: 3,
    FULL_HOUSE_TWO: 2,
    SMALL_STRAIGHT_LENGTH: 4,   // Any run of 4 consecutive
    LARGE_STRAIGHT_LENGTH: 5,   // Any run of 5 consecutive
};

/**
 * Enhancement bonuses (pips added when scored)
 * @const {Object}
 */
const ENHANCEMENT_BONUSES = {
    IRON_PIPS: 5,           // Clockwork (formerly Iron) adds +5 pips when scored
    GOLD_COINS: 1,          // Gold adds +1 gold when scored
    PARCHMENT_FAVOUR: 100,  // Engine hundredths; player sees +1 Favour
    PARCHMENT_GOLD: 5,      // Parchment can add +5 gold (reduced from 15)
    BLESSED_FAVOUR: 10,     // Engine hundredths; player sees +0.1 Favour
    // Wild and Mother of Pearl now work differently - no fixed bonuses
};

/**
 * Category to number mapping (for Ones, Twos, etc.)
 * @const {Object}
 */
const CATEGORY_TO_NUMBER = {
    'Ones': 1,
    'Twos': 2,
    'Threes': 3,
    'Fours': 4,
    'Fives': 5,
    'Sixes': 6,
    'Sevens': 7,
    'Eights': 8,
    'Nines': 9,
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BASE_SCORES,
        LOWER_SECTION_BONUSES,
        CATEGORY_PIPS_PER_LEVEL,
        BASE_FAVOUR,
        FAVOUR_FLOOR,
        WORSHIP_FAVOUR_PER_LEVEL,
        DEVOTION_BASE_CAPACITY,
        DEVOTION_TRIALS_TO_ASCEND,
        SCORING_THRESHOLDS,
        ENHANCEMENT_BONUSES,
        CATEGORY_TO_NUMBER
    };
}

