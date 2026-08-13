'use strict';
/**
 * Normalize worship card art to the same portrait card size as boons.
 *
 * Usage:
 *   npm run trim-worship-art             # process every file in AssetMapping.worship
 *   npm run trim-worship-art:dry         # report only, no writes
 *
 * Pipeline per image: trim transparent edges → fit inside 284×380 with transparent
 * padding. Worship art ships with its shrine frame drawn in, so unlike boon art it is
 * never centre-cropped — cropping would clip the candles at the frame's edges.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const ART_DIR = path.join(ROOT, 'game', 'public', 'ART');
const ASSET_MAPPING_PATH = path.join(ROOT, 'game', 'js', 'data', 'assetMapping.js');

const TARGET_W = 284;
const TARGET_H = 380;
const PADDING = 10;
const TRIM_THRESHOLD = 15;

const DRY_RUN = process.argv.includes('--dry-run');

function loadWorshipFilenames() {
    const src = fs.readFileSync(ASSET_MAPPING_PATH, 'utf8');
    const block = src.match(/    worship:\s*\{([\s\S]*?)\n    \},/);
    if (!block) throw new Error('Could not parse worship block in assetMapping.js');
    const files = [...block[1].matchAll(/:\s*'([^']+\.png)'/g)].map((m) => m[1]);
    return [...new Set(files)];
}

/**
 * @param {Buffer} input
 * @returns {Promise<Buffer>}
 */
async function processWorshipImage(input) {
    const trimmed = await sharp(input).trim({ threshold: TRIM_THRESHOLD }).toBuffer();
    const resized = await sharp(trimmed)
        .resize(TARGET_W - PADDING * 2, TARGET_H - PADDING * 2, { fit: 'inside' })
        .toBuffer();

    return sharp({
        create: {
            width: TARGET_W,
            height: TARGET_H,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([{ input: resized, gravity: 'center' }])
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();
}

async function processFile(filename) {
    const filePath = path.join(ART_DIR, filename);
    const before = await sharp(filePath).metadata();
    const beforeBytes = fs.statSync(filePath).size;
    const out = await processWorshipImage(fs.readFileSync(filePath));

    if (!DRY_RUN) {
        const tmp = `${filePath}.trim-tmp.png`;
        fs.writeFileSync(tmp, out);
        fs.renameSync(tmp, filePath);
    }

    const after = await sharp(out).metadata();
    return {
        filename,
        before: `${before.width}x${before.height}`,
        after: `${after.width}x${after.height}`,
        bytes: `${beforeBytes} → ${out.length}`,
    };
}

async function main() {
    if (!fs.existsSync(ART_DIR)) {
        console.error('ART folder not found:', ART_DIR);
        process.exit(1);
    }

    const files = loadWorshipFilenames();
    console.log(`[trim-worship-art] ${DRY_RUN ? 'DRY RUN — ' : ''}${files.length} mapped worship images`);

    let ok = 0;
    let fail = 0;
    for (const filename of files.sort()) {
        if (!fs.existsSync(path.join(ART_DIR, filename))) {
            console.warn(`  MISSING ${filename}`);
            fail += 1;
            continue;
        }
        try {
            const result = await processFile(filename);
            console.log(`  ${result.filename}: ${result.before} → ${result.after} (${result.bytes})`);
            ok += 1;
        } catch (err) {
            console.error(`  FAIL ${filename}:`, err.message);
            fail += 1;
        }
    }

    console.log('');
    console.log(`[trim-worship-art] Done: ${ok} processed, ${fail} failed`);
    if (DRY_RUN) console.log('[trim-worship-art] Dry run — no files written.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
