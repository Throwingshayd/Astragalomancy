/**
 * Game Balance Constants
 * All magic numbers for game balance in one place for easy tuning
 * @module GameConstants
 */

/**
 * Debug / test flags - set BOSS_BLINDS_DISABLED to true to skip ante boss effects
 * (for stress testing, development, or simplified gameplay)
 * @const {Object}
 */
const DEBUG_FLAGS = {
    BOSS_BLINDS_DISABLED: false  // Random beatable boss blinds (BlindDirector)
};

/**
 * Core game balance configuration
 * @const {Object}
 */
const GAME_BALANCE = {
    // Starting values - Balatro-inspired tightening
    STARTING_GOLD: 6,  // Reduced from 15 - creates gold tension!
    STARTING_ROLLS: 3,
    STARTING_DICE_COUNT: 5,
    
    // Progression
    MAX_TURNS_PER_ANTE: 13,
    STARTING_ANTE: 1,
    STARTING_SCORE_THRESHOLD: 20000,
    THRESHOLD_INCREASE_PER_ANTE: 10000,
    
    // Economy - Balatro-inspired
    SHOP_REROLL_COST: 4,  // Increased from 2 - rerolls are now expensive!
    FREE_REROLLS_PER_ANTE: 1,
    /** Gold per hand scored — awarded ONLY at cashout (shop open), not during round */
    GOLD_PER_SCORE: 1,
    /** Interest: +1 per N gold saved (applies at cashout, on gold AFTER scores) */
    INTEREST_RATE: 5,
    /** Max interest per cashout */
    MAX_INTEREST: 5,
    
    // Slots (Card capacity) — worship and libations hold separate rails, see game/ConsumableSlots.js
    STARTING_BOON_SLOTS: 5,
    STARTING_LIBATION_SLOTS: 3,
    STARTING_WORSHIP_SLOTS: 2,
    
    // Base multipliers
    BASE_FAVOUR: 100,
    
    // Dice face limits
    MIN_DIE_FACE: 1,
    MAX_DIE_FACE: 6,
    MAX_DIE_FACE_WITH_ENHANCEMENTS: 9,
};

/**
 * Card costs and prices
 * @const {Object}
 */
const CARD_ECONOMY = {
    // Boon prices by rarity - Balatro-style strict tiers
    RUSTIC_BOON_COST: 3,
    VIBRANT_BOON_COST: 5,  // Increased from 4
    EPIC_BOON_COST: 8,     // Increased from 6 - rare should be expensive!
    
    // Worship prices
    WORSHIP_CARD_COST: 3,
    
    // Libation prices
    LIBATION_BASE_COST: 2,
    LIBATION_PREMIUM_COST: 3,
    
    // Artifacts are a flat 10g at both tiers. An upgrade is gated by owning its base and
    // by the one-offer-per-trial cap, not by price.
    ARTIFACT_BASE_COST: 10,
    ARTIFACT_UPGRADED_COST: 10,
    
    // Pack prices
    BOON_PACK_COST: 4,
    WORSHIP_PACK_COST: 4,
    LIBATION_PACK_COST: 4,
    CHAOS_PACK_COST: 6,
    
    // Sell values - Balatro-inspired (25% of cost, not 75%!)
    SELL_VALUE_PERCENTAGE: 0.25,  // Creates gold sink
    DEFAULT_SELL_VALUE: 1,
};

/**
 * Rarity distribution weights for BOONS ONLY (Balatro-style)
 * Worship, libation, and artifact have no rarity - all equal chance when selected.
 * Higher weight = more likely. Epic rare, Rustic common.
 * @const {Object}
 */
const RARITY_WEIGHTS = {
    RUSTIC: 60,      // Common - ~60% of boon pool
    VIBRANT: 30,     // Uncommon - ~30%
    EPIC: 10,        // Rare - ~10% (Balatro: rare boons are scarce)
    LEGENDARY: 2,    // Legendary - very rare (shopExclude typically)
};

/**
 * Enhancement probabilities
 * @const {Object}
 */
const ENHANCEMENT_CHANCES = {
    PARCHMENT_FAVOUR_CHANCE: 0.25,   // 25% for +100 Favour
    PARCHMENT_GOLD_CHANCE: 0.15      // 15% for +5 gold
};

/**
 * God-to-Category mapping - Single source of truth for scoring
 * Category → God (used when scoring a category to look up worship/favour)
 * @const {Object.<string,string>}
 */
const GOD_TO_CATEGORY = {
    'Ones': 'Artemis', 'Twos': 'Aphrodite', 'Threes': 'Morpheus',
    'Fours': 'Hera', 'Fives': 'Athena', 'Sixes': 'Heracles',
    'Sevens': 'The Pleiades', 'Eights': 'Poseidon', 'Nines': 'The Nine Muses',
    'Three of a Kind': 'Hephaestus', 'Four of a Kind': 'Ares', 'Full House': 'Dionysus',
    'Small Straight': 'Hermes', 'Large Straight': 'Apollo', 'Yahtzee': 'Zeus', 'Chance': 'Nyx',
    "Pandora's Box": "Pandora's Box"
};

/**
 * God Metadata - Information about each deity in the pantheon
 * Includes gender for potential boon interactions. category must match GOD_TO_CATEGORY values.
 * @const {Object}
 */
const GOD_METADATA = {
    // Upper Sanctum (Ones through Sixes)
    'Artemis': { gender: 'female', domain: 'hunt', category: 'Ones' },
    'Aphrodite': { gender: 'female', domain: 'love/beauty', category: 'Twos' },
    'Morpheus': { gender: 'male', domain: 'dreams', category: 'Threes' },
    'Hera': { gender: 'female', domain: 'marriage', category: 'Fours' },
    'Athena': { gender: 'female', domain: 'wisdom', category: 'Fives' },
    'Heracles': { gender: 'male', domain: 'strength', category: 'Sixes' },
    // Lower Sanctum (Combinations)
    'Hephaestus': { gender: 'male', domain: 'forge', category: 'Three of a Kind' },
    'Ares': { gender: 'male', domain: 'war', category: 'Four of a Kind' },
    'Dionysus': { gender: 'male', domain: 'wine', category: 'Full House' },
    'Hermes': { gender: 'male', domain: 'travel', category: 'Small Straight' },
    'Apollo': { gender: 'male', domain: 'sun', category: 'Large Straight' },
    'Zeus': { gender: 'male', domain: 'sky', category: 'Yahtzee' },
    'Nyx': { gender: 'female', domain: 'night', category: 'Chance' },
    // High Sanctum (Bonus Categories)
    'The Pleiades': { gender: 'female', domain: 'stars', category: 'Sevens', note: 'Seven sisters' },
    'Poseidon': { gender: 'male', domain: 'sea', category: 'Eights' },
    'The Nine Muses': { gender: 'female', domain: 'arts', category: 'Nines', note: 'Nine goddesses' },
    // Pandora's Box: unlock when both upper and lower bonus awarded
    "Pandora's Box": { gender: 'female', domain: 'mystery', category: "Pandora's Box", note: 'Combined upper+lower bonus' }
};

/**
 * Helper functions for god metadata
 */
const GodUtils = {
    /**
     * Get the gender of a god
     * @param {string} godName - Name of the god
     * @returns {string|null} 'male', 'female', or null if god not found
     */
    getGender(godName) {
        return GOD_METADATA[godName]?.gender || null;
    },
    
    /**
     * Get all gods of a specific gender
     * @param {string} gender - 'male' or 'female'
     * @returns {Array<string>} Array of god names
     */
    getGodsByGender(gender) {
        return Object.entries(GOD_METADATA)
            .filter(([_, data]) => data.gender === gender)
            .map(([name, _]) => name);
    },
    
    /**
     * Get all female gods
     * @returns {Array<string>} Array of goddess names
     */
    getFemaleGods() {
        return this.getGodsByGender('female');
    },
    
    /**
     * Get all male gods
     * @returns {Array<string>} Array of god names
     */
    getMaleGods() {
        return this.getGodsByGender('male');
    },
    
    /**
     * Get the domain of a god
     * @param {string} godName - Name of the god
     * @returns {string|null} Domain or null if god not found
     */
    getDomain(godName) {
        return GOD_METADATA[godName]?.domain || null;
    },
    
    /**
     * Get the category associated with a god
     * @param {string} godName - Name of the god
     * @returns {string|null} Category or null if god not found
     */
    getCategory(godName) {
        return GOD_METADATA[godName]?.category || null;
    },

    /**
     * Get the god for a score category (canonical mapping)
     * @param {string} category - Score category (e.g. 'Ones', 'Full House')
     * @returns {string|null} God name or null
     */
    getGodForCategory(category) {
        return GOD_TO_CATEGORY[category] || null;
    },

    /**
     * Check if a god is female
     * @param {string} godName - Name of the god
     * @returns {boolean} True if goddess
     */
    isFemale(godName) {
        return this.getGender(godName) === 'female';
    },
    
    /**
     * Check if a god is male
     * @param {string} godName - Name of the god
     * @returns {boolean} True if male god
     */
    isMale(godName) {
        return this.getGender(godName) === 'male';
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEBUG_FLAGS,
        GAME_BALANCE,
        CARD_ECONOMY,
        RARITY_WEIGHTS,
        ENHANCEMENT_CHANCES,
        GOD_TO_CATEGORY,
        GOD_METADATA,
        GodUtils
    };
}

