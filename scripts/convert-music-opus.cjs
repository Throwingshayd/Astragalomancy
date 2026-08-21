'use strict';
/**
 * Re-encode the soundtrack beds from MP3 to Opus.
 *
 * The beds are already 128 kbps MP3, so there is nothing left to win by lowering the
 * MP3 bitrate — the size is duration, not encoding waste. Opus at half the bitrate
 * still beats 128k MP3 on ambient material, which is where the savings come from.
 *
 * MP3 sources are kept by default so re-running at a different bitrate always encodes
 * from the 128k original rather than stacking generation loss on a previous Opus pass.
 *
 * Usage: npm run convert-music-opus
 *        npm run convert-music-opus -- --bitrate=48
 *        npm run convert-music-opus -- --remove-source
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const MUSIC_DIR = path.resolve(__dirname, '..', 'game', 'public', 'ART', 'Music');
const REMOVE_SOURCE = process.argv.includes('--remove-source');
const DRY_RUN = process.argv.includes('--dry-run');

const bitrateArg = process.argv.find((a) => a.startsWith('--bitrate='));
const BITRATE = bitrateArg ? Number(bitrateArg.split('=')[1]) : 64;

function fmtBytes(n) {
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(2)} MB`;
}

function walkMp3(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walkMp3(full));
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mp3')) out.push(full);
    }
    return out;
}

function main() {
    if (!Number.isFinite(BITRATE) || BITRATE < 16 || BITRATE > 256) {
        console.error(`[opus] Bad --bitrate=${BITRATE}; expected 16–256.`);
        process.exit(1);
    }

    const files = walkMp3(MUSIC_DIR).sort();
    console.log(`[opus] ${DRY_RUN ? 'DRY RUN — ' : ''}${files.length} MP3s → Opus @ ${BITRATE}k VBR`);

    let beforeTotal = 0;
    let afterTotal = 0;

    for (const file of files) {
        const rel = path.relative(MUSIC_DIR, file).replace(/\\/g, '/');
        const before = fs.statSync(file).size;
        beforeTotal += before;

        const output = file.replace(/\.mp3$/i, '.opus');
        if (DRY_RUN) {
            console.log(`  ${rel} → ${path.basename(output)}`);
            continue;
        }

        const res = spawnSync(ffmpeg, [
            '-y', '-hide_banner', '-loglevel', 'error',
            '-i', file,
            '-c:a', 'libopus',
            '-b:a', `${BITRATE}k`,
            '-vbr', 'on',
            // Ambient beds, not speech — tell the encoder to optimise for full-range audio.
            '-application', 'audio',
            // Longer frames trade a little latency for better efficiency; playback is not interactive.
            '-frame_duration', '60',
            output,
        ], { encoding: 'utf8' });

        if (res.status !== 0) {
            console.error(`  FAILED ${rel}: ${res.stderr || res.status}`);
            process.exit(1);
        }

        const after = fs.statSync(output).size;
        afterTotal += after;
        const pct = (((before - after) / before) * 100).toFixed(0);
        console.log(`  ${rel}: ${fmtBytes(before)} → ${fmtBytes(after)} (−${pct}%)`);

        if (REMOVE_SOURCE) fs.unlinkSync(file);
    }

    if (DRY_RUN) return;

    console.log('');
    console.log(`[opus] Music: ${fmtBytes(beforeTotal)} → ${fmtBytes(afterTotal)} (saved ${fmtBytes(beforeTotal - afterTotal)})`);
    if (REMOVE_SOURCE) {
        console.log('[opus] MP3 sources deleted.');
    } else {
        console.log('[opus] MP3 sources kept. Re-run with --remove-source once you are happy with the bitrate.');
    }
}

main();
