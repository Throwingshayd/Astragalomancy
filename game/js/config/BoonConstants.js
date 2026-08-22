/**
 * Boon numbers that handlers actually read.
 * @module BoonConstants
 */

const BOON_EFFECTS = {
    SISYPHUS_BOULDER: {
        PIPS_PER_REROLL: 5
    },

    PANDORAS_JAR: {
        DESTROY_INTERVAL: 3,
        FAVOUR_BONUS: 200
    },

    PARMENIDES_DIE: {
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

    FIRST_BLOOD: {
        FIRST_SCORE_BONUS: 50
    },

    MIDNIGHT_OIL: {
        LATE_GAME_TURN: 12,
        PIPS_BONUS: 24,
        ROLL_PENALTY: 1
    }
};

if (typeof window !== 'undefined') {
    window.BOON_EFFECTS = BOON_EFFECTS;
}
