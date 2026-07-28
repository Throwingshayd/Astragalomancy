'use strict';
/**
 * Remove orphaned public assets not referenced by gameplay (safe for release builds).
 * Source die-face PNGs stay — needed by build-dice-spritesheet; trimmed from dist post-build.
 *
 * Usage: npm run prune:release-assets
 *        npm run prune:release-assets -- --dry-run
 */

const fs = require('fs');
const path = require('path');

const ART = path.resolve(__dirname, '..', 'game', 'public', 'ART');
const DRY_RUN = process.argv.includes('--dry-run');

/** Duplicate MusicGPT exports + legacy tracks not in run/shop pools */
const REMOVE_REL = [
    'Dionysuss_Gamble_DEFAULT_MusicGPT.mp3',
    'Frame_Drum_Pulse_DEFAULT_MusicGPT.mp3',
    'Gods_Dice_Game_DEFAULT_MusicGPT (1).mp3',
    'Gods_Dice_Game_DEFAULT_MusicGPT.mp3',
    'Symposium_Drift_DEFAULT_MusicGPT.mp3',
    'Music/frame_drum_pulse.mp3',
    'Music/gods_dice_game.mp3',
    'Music/gods_dice_game_alt.mp3',
    'Music/dionysus_gamble.mp3',
    'Music/phi/12_before_the_pyramids.mp3',
    'astragolomancy.png',
    'astragalomancy-title.png',
];

function fmtBytes(n) {
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function main() {
    let removed = 0;
    let saved = 0;
    let missing = 0;

    console.log(`[prune:release-assets] ${DRY_RUN ? 'DRY RUN — ' : ''}Checking ${REMOVE_REL.length} orphaned paths`);

    for (const rel of REMOVE_REL) {
        const full = path.join(ART, rel);
        if (!fs.existsSync(full)) {
            missing += 1;
            continue;
        }
        const size = fs.statSync(full).size;
        saved += size;
        removed += 1;
        console.log(`  ${DRY_RUN ? 'would remove' : 'remove'} ${rel} (${fmtBytes(size)})`);
        if (!DRY_RUN) fs.unlinkSync(full);
    }

    console.log('');
    console.log(`[prune:release-assets] ${removed} removed, ${missing} already absent, saved ${fmtBytes(saved)}`);
}

main();
