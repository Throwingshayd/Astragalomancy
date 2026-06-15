'use strict';
/**
 * Remix Phi-Psonics stems for in-game deck: subtle walking-bass emphasis +
 * warm retro band-limit (Balatro-adjacent, not heavy-handed).
 *
 * Usage: node scripts/remix-phi-psonics.cjs
 *        node scripts/remix-phi-psonics.cjs --track 3
 *
 * Source (local): Soulseek album folder below.
 * Ship only with proper rights; dev/personal remix tooling.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const SOURCE_DIR = path.join(
    'C:',
    'Users',
    'Lorcan',
    'Documents',
    'Soulseek Downloads',
    'complete',
    'zeytin',
    'Phi-Psonics - Expanding To One (2025)'
);
const OUT_DIR = path.resolve(__dirname, '..', 'game', 'public', 'ART', 'Music', 'phi');

/** Clarity-first chain — light bass glue, open top (game bus adds warmth) */
const REMIX_AF = [
    'highpass=f=45',
    'equalizer=f=90:width_type=q:width=1.1:g=1.8',
    'equalizer=f=180:width_type=q:width=1:g=1.2',
    'equalizer=f=3800:width_type=q:width=1:g=1.2',
    'highshelf=f=9000:width_type=h:width=2000:g=-0.8',
    'lowpass=f=16000',
    'acompressor=threshold=-24dB:ratio=2:attack=20:release=220:makeup=1.2',
    'alimiter=limit=0.94:level=false'
].join(',');

const TRACK_MAP = [
    { n: 1, slug: 'prelude_expansion', match: '01' },
    { n: 2, slug: 'theres_still_hope', match: '02' },
    { n: 3, slug: 'healing_time', match: '03' },
    { n: 4, slug: 'many_paths', match: '04' },
    { n: 5, slug: 'sunrise', match: '05' },
    { n: 6, slug: 'love_theme', match: '06' },
    { n: 7, slug: 'were_all_one', match: '07' },
    { n: 8, slug: 'nature_signs', match: '08' },
    { n: 9, slug: 'discovery', match: '09' },
    { n: 10, slug: 'it_finds_a_way', match: '10' },
    { n: 11, slug: 'sounds_of_the_universe', match: '11' },
    { n: 12, slug: 'before_the_pyramids', match: '12' },
    { n: 13, slug: 'new_pyramid', match: '13' },
    { n: 14, slug: 'mysteries_of_the_dark', match: '14' }
];

function fmtBytes(n) {
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function findSourceFile(match) {
    const files = fs.readdirSync(SOURCE_DIR);
    const hit = files.find((f) => f.startsWith(match) && f.toLowerCase().endsWith('.flac'));
    if (!hit) throw new Error(`No FLAC for track ${match} in ${SOURCE_DIR}`);
    return path.join(SOURCE_DIR, hit);
}

function remixOne(track) {
    const input = findSourceFile(track.match);
    const outName = `${String(track.n).padStart(2, '0')}_${track.slug}.mp3`;
    const output = path.join(OUT_DIR, outName);
    const before = fs.statSync(input).size;

    console.log(`\n[${track.n}/14] ${path.basename(input)}`);
    console.log(`  → ${outName}`);

    execFileSync(
        ffmpegPath,
        [
            '-y',
            '-hide_banner',
            '-loglevel', 'error',
            '-i', input,
            '-map', '0:a:0',
            '-af', REMIX_AF,
            '-codec:a', 'libmp3lame',
            '-b:a', '128k',
            '-ar', '44100',
            output
        ],
        { stdio: 'inherit' }
    );

    const after = fs.statSync(output).size;
    console.log(`  done ${fmtBytes(before)} → ${fmtBytes(after)}`);
    return { id: `phi_${track.slug}`, file: `ART/Music/phi/${outName}` };
}

function main() {
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error('Source album not found:', SOURCE_DIR);
        process.exit(1);
    }
    if (!ffmpegPath) {
        console.error('ffmpeg-static missing — run npm install ffmpeg-static');
        process.exit(1);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    const onlyArg = process.argv.indexOf('--track');
    const onlyN = onlyArg >= 0 ? Number(process.argv[onlyArg + 1]) : null;
    const queue = onlyN
        ? TRACK_MAP.filter((t) => t.n === onlyN)
        : TRACK_MAP;

    if (onlyN && !queue.length) {
        console.error('Invalid --track number (1–14)');
        process.exit(1);
    }

    const manifest = [];
    for (const track of queue) {
        manifest.push(remixOne(track));
    }

    const manifestPath = path.join(OUT_DIR, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\nWrote ${manifest.length} remix(es) → ${OUT_DIR}`);
    console.log('Manifest:', manifestPath);
}

main();
