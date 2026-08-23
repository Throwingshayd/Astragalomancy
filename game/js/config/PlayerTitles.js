/**
 * Player-facing scorecard titles. Internal keys stay for saves and handlers.
 * @module PlayerTitles
 */

const PLAYER_TITLES = {
    'Ones': 'Ones',
    'Twos': 'Twos',
    'Threes': 'Threes',
    'Fours': 'Fours',
    'Fives': 'Fives',
    'Sixes': 'Sixes',
    'Sevens': 'Sevens',
    'Eights': 'Eights',
    'Nines': 'Nines',
    'Three of a Kind': 'The Anvil',
    'Four of a Kind': 'The Spoils',
    'Full House': 'The Feast',
    'Small Straight': 'The Short Road',
    'Large Straight': 'The Long Course',
    'Extra Long Straight': 'The Spectrum',
    'Yahtzee': 'The House',
    'Heureka': 'Heureka',
    'Chance': 'Night',
    "Pandora's Jar": 'The Jar',
    "Pandora's Box": 'The Jar',
};

const PlayerTitles = {
    display(category) {
        return PLAYER_TITLES[category] || category;
    },
};

if (typeof window !== 'undefined') {
    window.PLAYER_TITLES = PLAYER_TITLES;
    window.PlayerTitles = PlayerTitles;
}
