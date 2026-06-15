/**
 * Run music pool — shuffled deck per seed (roguelike soundtrack).
 * Phi-Psonics remixes: scripts/remix-phi-psonics.cjs (bass-forward, warm retro band-limit).
 *
 * @see SoundManager.initRunDeck
 */
/* exported MUSIC_POOL, MUSIC_TRACKS */

/** Track IDs consumed by the per-run shuffle deck (no stage/event gating). */
const MUSIC_POOL = [
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
    'phi_mysteries_of_the_dark'
];

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
    phi_before_the_pyramids: 'ART/Music/phi/12_before_the_pyramids.mp3',
    phi_new_pyramid: 'ART/Music/phi/13_new_pyramid.mp3',
    phi_mysteries_of_the_dark: 'ART/Music/phi/14_mysteries_of_the_dark.mp3',
    // Original MusicGPT stems (optional — add IDs to MUSIC_POOL to include)
    frame_drum: 'ART/Music/frame_drum_pulse.mp3',
    gods_dice: 'ART/Music/gods_dice_game.mp3',
    gods_dice_alt: 'ART/Music/gods_dice_game_alt.mp3',
    dionysus_gamble: 'ART/Music/dionysus_gamble.mp3',
    music1: 'ART/Music/lute 1 effects.ogg',
    music2: 'ART/Music/lute 2 w effects.ogg',
    music3: 'ART/Music/lute 3 w effects.ogg',
    music4: 'ART/Music/lute 4 w effects.ogg',
    music5: 'ART/Music/lute 5 w effects.ogg'
};
