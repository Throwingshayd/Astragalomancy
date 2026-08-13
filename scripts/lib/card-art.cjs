'use strict';
/**
 * Shared normalizer for card art (worship, libations).
 *
 * Card art is drawn with `background-size: contain` in a 140×187 slot, so any
 * transparent margin baked into the PNG shrinks the card on screen. Every
 * mapped image is trimmed, centre-cropped to the card ratio and written at
 * 284×380 so each card fills its slot edge to edge.
 *
 * `zoom` overscans before the crop: 1 fits the whole illustration to the card,
 * 1.1 cuts 10% deeper into its edges.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const ART_DIR = path.join(ROOT, 'game', 'public', 'ART');
const ASSET_MAPPING_PATH = path.join(ROOT, 'game', 'js', 'data', 'assetMapping.js');

const TARGET_W = 284;
const TARGET_H = 380;
const CARD_RATIO = TARGET_W / TARGET_H;
const TRIM_THRESHOLD = 15;

/** Crop this deep into an illustration and someone should eyeball the result. */
const LOUD_CROP = 0.2;

/** Read one `key: { 'id': 'file.png' }` block out of assetMapping.js. */
function mappedFilenames(blockName) {
    const src = fs.readFileSync(ASSET_MAPPING_PATH, 'utf8');
    const block = src.match(new RegExp(`    ${blockName}:\\s*\\{([\\s\\S]*?)\\n    \\},`));
    if (!block) throw new Error(`Could not parse ${blockName} block in assetMapping.js`);
    const files = [...block[1].matchAll(/:\s*'([^']+\.png)'/g)].map((m) => m[1]);
    return [...new Set(files)].sort();
}

/**
 * @param {Buffer} input
 * @param {number} zoom
 * @returns {Promise<{ out: Buffer, content: string, cropped: number }>}
 */
async function normalizeCardArt(input, zoom = 1) {
    const trimmed = await sharp(input).trim({ threshold: TRIM_THRESHOLD }).toBuffer();
    const meta = await sharp(trimmed).metadata();
    const ratio = meta.width / meta.height;
    const ratioCrop = ratio > CARD_RATIO ? 1 - CARD_RATIO / ratio : 1 - ratio / CARD_RATIO;

    const overW = Math.round(TARGET_W * zoom);
    const overH = Math.round(TARGET_H * zoom);
    const filled = await sharp(trimmed)
        .resize(overW, overH, { fit: 'cover', position: 'centre' })
        .toBuffer();

    const out = await sharp(filled)
        .extract({
            left: Math.round((overW - TARGET_W) / 2),
            top: Math.round((overH - TARGET_H) / 2),
            width: TARGET_W,
            height: TARGET_H,
        })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

    return {
        out,
        content: `${meta.width}x${meta.height}`,
        cropped: 1 - (1 - ratioCrop) / zoom ** 2,
    };
}

function parseZoom(argv, fallback) {
    const arg = argv.find((a) => a.startsWith('--zoom='));
    if (!arg) return fallback;
    const zoom = Number(arg.slice('--zoom='.length));
    if (!Number.isFinite(zoom) || zoom < 1 || zoom > 2) {
        throw new Error(`--zoom must be between 1 and 2, got ${arg}`);
    }
    return zoom;
}

/**
 * @param {{ label: string, block: string, zoom: number, backupDir: string }} opts
 */
async function run({ label, block, zoom, backupDir }) {
    if (!fs.existsSync(ART_DIR)) {
        console.error('ART folder not found:', ART_DIR);
        process.exit(1);
    }

    const dryRun = process.argv.includes('--dry-run');
    const files = mappedFilenames(block);
    console.log(`[${label}] ${dryRun ? 'DRY RUN — ' : ''}${files.length} mapped images, zoom ${zoom}`);

    let ok = 0;
    let fail = 0;
    const loud = [];

    for (const filename of files) {
        const filePath = path.join(ART_DIR, filename);
        if (!fs.existsSync(filePath)) {
            console.warn(`  MISSING ${filename}`);
            fail += 1;
            continue;
        }
        try {
            const before = await sharp(filePath).metadata();
            const beforeBytes = fs.statSync(filePath).size;
            const { out, content, cropped } = await normalizeCardArt(fs.readFileSync(filePath), zoom);

            if (!dryRun) {
                const dest = path.join(backupDir, filename);
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                    fs.copyFileSync(filePath, dest);
                }
                const tmp = `${filePath}.trim-tmp.png`;
                fs.writeFileSync(tmp, out);
                fs.renameSync(tmp, filePath);
            }

            const pct = `${Math.round(cropped * 100)}% cropped`;
            console.log(
                `  ${filename}: ${before.width}x${before.height} (art ${content}) → ${TARGET_W}x${TARGET_H}`
                + ` (${beforeBytes} → ${out.length}) [${pct}]`
            );
            if (cropped >= LOUD_CROP) loud.push(`${filename} (${pct})`);
            ok += 1;
        } catch (err) {
            console.error(`  FAIL ${filename}:`, err.message);
            fail += 1;
        }
    }

    console.log('');
    console.log(`[${label}] Done: ${ok} processed, ${fail} failed`);
    if (loud.length) {
        console.log(`[${label}] Heavy crop — check these look right:`);
        for (const line of loud) console.log(`  ${line}`);
    }
    if (dryRun) console.log(`[${label}] Dry run — no files written.`);
    else console.log(`[${label}] Originals backed up in ${path.relative(ROOT, backupDir)}`);
}

module.exports = {
    ART_DIR,
    ROOT,
    TARGET_W,
    TARGET_H,
    TRIM_THRESHOLD,
    mappedFilenames,
    normalizeCardArt,
    parseZoom,
    run,
};
