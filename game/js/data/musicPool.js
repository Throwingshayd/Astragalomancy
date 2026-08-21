/**
 * Dual-bed soundtrack: preexisting Phi beds run continuously underneath;
 * layered tracks play on top. One rotation for the whole session — no
 * per-screen tracks.
 *
 * @see SoundManager.initRunDeck
 */
/* exported MUSIC_BASE_POOL, MUSIC_LAYER_POOL, MUSIC_POOL, MUSIC_TRACKS, MUSIC_LAYER_IDS */

/** Preexisting Phi beds — always-on under bed (80% gain). */
const MUSIC_BASE_POOL = [
    'phi_prelude_expansion',
    'phi_theres_still_hope',
    'phi_healing_time',
    'phi_many_paths',
    'phi_sunrise',
    'phi_love_theme',
    'phi_were_all_one',
    'phi_nature_signs',
    'phi_discovery',
    'phi_it_finds_a_way',
    'phi_sounds_of_the_universe',
    'phi_new_pyramid',
    'phi_mysteries_of_the_dark',
];

/** New beds — shuffle on top of the base layer (full gain). */
const MUSIC_LAYER_POOL = [
    'greek_tales',
    'celtic_mystical',
    'veil_of_ash',
    'davids_vigilance',
    'ancientone',
];

/** @deprecated Prefer MUSIC_BASE_POOL / MUSIC_LAYER_POOL — kept as base alias. */
const MUSIC_POOL = MUSIC_BASE_POOL;

/** Layer track IDs (top bed). */
const MUSIC_LAYER_IDS = Object.freeze(MUSIC_LAYER_POOL.slice());

/** Track ID → file under game/public/ */
const MUSIC_TRACKS = {
    phi_prelude_expansion: 'ART/Music/phi/01_prelude_expansion.opus',
    phi_theres_still_hope: 'ART/Music/phi/02_theres_still_hope.opus',
    phi_healing_time: 'ART/Music/phi/03_healing_time.opus',
    phi_many_paths: 'ART/Music/phi/04_many_paths.opus',
    phi_sunrise: 'ART/Music/phi/05_sunrise.opus',
    phi_love_theme: 'ART/Music/phi/06_love_theme.opus',
    phi_were_all_one: 'ART/Music/phi/07_were_all_one.opus',
    phi_nature_signs: 'ART/Music/phi/08_nature_signs.opus',
    phi_discovery: 'ART/Music/phi/09_discovery.opus',
    phi_it_finds_a_way: 'ART/Music/phi/10_it_finds_a_way.opus',
    phi_sounds_of_the_universe: 'ART/Music/phi/11_sounds_of_the_universe.opus',
    phi_new_pyramid: 'ART/Music/phi/13_new_pyramid.opus',
    phi_mysteries_of_the_dark: 'ART/Music/phi/14_mysteries_of_the_dark.opus',
    greek_tales: 'ART/Music/layer/greek_tales.opus',
    celtic_mystical: 'ART/Music/layer/celtic_mystical.opus',
    veil_of_ash: 'ART/Music/layer/veil_of_ash.opus',
    davids_vigilance: 'ART/Music/layer/davids_vigilance.opus',
    ancientone: 'ART/Music/layer/ancientone.opus',
};
