/**
 * Dual-bed soundtrack: preexisting Phi beds run continuously underneath;
 * layered tracks (and market in shop) play on top.
 *
 * @see SoundManager.initRunDeck
 */
/* exported MUSIC_BASE_POOL, MUSIC_LAYER_POOL, MUSIC_POOL, MUSIC_TRACKS, MUSIC_LAYER_IDS, MUSIC_SHOP_TRACK_ID */

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

/** Shop / pack top-bed loop — not in the run layer deck. */
const MUSIC_SHOP_TRACK_ID = 'market';

/** Track ID → file under game/public/ */
const MUSIC_TRACKS = {
    phi_prelude_expansion: 'ART/Music/phi/01_prelude_expansion.mp3',
    phi_theres_still_hope: 'ART/Music/phi/02_theres_still_hope.mp3',
    phi_healing_time: 'ART/Music/phi/03_healing_time.mp3',
    phi_many_paths: 'ART/Music/phi/04_many_paths.mp3',
    phi_sunrise: 'ART/Music/phi/05_sunrise.mp3',
    phi_love_theme: 'ART/Music/phi/06_love_theme.mp3',
    phi_were_all_one: 'ART/Music/phi/07_were_all_one.mp3',
    phi_nature_signs: 'ART/Music/phi/08_nature_signs.mp3',
    phi_discovery: 'ART/Music/phi/09_discovery.mp3',
    phi_it_finds_a_way: 'ART/Music/phi/10_it_finds_a_way.mp3',
    phi_sounds_of_the_universe: 'ART/Music/phi/11_sounds_of_the_universe.mp3',
    phi_new_pyramid: 'ART/Music/phi/13_new_pyramid.mp3',
    phi_mysteries_of_the_dark: 'ART/Music/phi/14_mysteries_of_the_dark.mp3',
    greek_tales: 'ART/Music/layer/greek_tales.mp3',
    celtic_mystical: 'ART/Music/layer/celtic_mystical.mp3',
    veil_of_ash: 'ART/Music/layer/veil_of_ash.mp3',
    davids_vigilance: 'ART/Music/layer/davids_vigilance.mp3',
    ancientone: 'ART/Music/layer/ancientone.mp3',
    market: 'ART/Music/layer/market.mp3',
    music1: 'ART/Music/lute 1 effects.ogg',
    music2: 'ART/Music/lute 2 w effects.ogg',
    music3: 'ART/Music/lute 3 w effects.ogg',
    music4: 'ART/Music/lute 4 w effects.ogg',
    music5: 'ART/Music/lute 5 w effects.ogg',
};
