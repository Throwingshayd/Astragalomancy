'use strict';
/**
 * Re-encode MP3 soundtrack beds at 128 kbps when that yields a smaller file.
 * Ambient beds tolerate 128k; leaves filenames/paths unchanged.
 *
 * Usage: npm run optimize-music
 *        npm run optimize-music -- --dry-run
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ART = path.resolve(__dirname, '..', 'game', 'public', 'ART');
const DRY_RUN = process.argv.includes('--dry-run');
const BITRATE = '128k';

function fmtBytes(n) {
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function walkMp3(dir) {
    /** @type {string[]} */
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walkMp3(full));
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mp3')) out.push(full);
    }
    return out;
}

function main() {
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
    } catch {
        console.error('[optimize-music] ffmpeg not found — install ffmpeg or skip this step.');
        process.exit(1);
    }

    const files = walkMp3(ART);
    let beforeTotal = 0;
    let afterTotal = 0;
    let changed = 0;
    let skipped = 0;

    console.log(`[optimize-music] ${DRY_RUN ? 'DRY RUN — ' : ''}${files.length} MP3s under ART/`);

    for (const file of files) {
        const rel = path.relative(ART, file).replace(/\\/g, '/');
        const before = fs.statSync(file).size;
        beforeTotal += before;

        const tmp = path.join(os.tmpdir(), `dod-mp3-${Date.now()}-${path.basename(file)}`);
        try {
            execSync(
                `ffmpeg -y -hide_banner -loglevel error -i ${JSON.stringify(file)} -c:a libmp3lame -b:a ${BITRATE} -ar 44100 ${JSON.stringify(tmp)}`,
            );
        } catch (e) {
            console.warn(`  skip ${rel}: ffmpeg failed`);
            afterTotal += before;
            skipped += 1;
            continue;
        }

        const after = fs.statSync(tmp).size;
        if (after >= before) {
            afterTotal += before;
            skipped += 1;
            if (!DRY_RUN) fs.unlinkSync(tmp);
            continue;
        }

        changed += 1;
        afterTotal += after;
        const pct = (((before - after) / before) * 100).toFixed(1);
        console.log(`  ${rel}: ${fmtBytes(before)} → ${fmtBytes(after)} (${pct}%)`);
        if (!DRY_RUN) {
            fs.copyFileSync(tmp, file);
            fs.unlinkSync(tmp);
        }
    }

    const saved = beforeTotal - afterTotal;
    console.log('');
    console.log(`[optimize-music] Changed: ${changed}, skipped: ${skipped}`);
    console.log(`[optimize-music] MP3 total: ${fmtBytes(beforeTotal)} → ${fmtBytes(afterTotal)} (saved ${fmtBytes(saved)})`);
    if (DRY_RUN) console.log('[optimize-music] Dry run — no files written.');
}

main();
