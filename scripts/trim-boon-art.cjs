'use strict';
/**
 * Trim AI padding from boon card art, normalize to portrait card size, and sync assetMapping.
 *
 * Usage:
 *   npm run trim-boon-art              # process all mapped boons
 *   npm run trim-boon-art -- --dry-run  # report only, no writes
 *   npm run trim-boon-art -- --mapping-only  # update assetMapping.js only
 *
 * Pipeline per image: trim white/uniform edges → center-crop to 3:4 if needed →
 * fit inside 284×380 with transparent padding (matches Boon Card Factory).
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const ART_DIR = path.join(ROOT, 'game', 'public', 'ART');
const GAME_DATA_PATH = path.join(ROOT, 'game', 'js', 'data', 'gameData.js');
const ASSET_MAPPING_PATH = path.join(ROOT, 'game', 'js', 'data', 'assetMapping.js');

const TARGET_W = 284;
const TARGET_H = 380;
const PADDING = 10;
const TRIM_THRESHOLD = 15;
const CARD_RATIO = TARGET_W / TARGET_H;

const DRY_RUN = process.argv.includes('--dry-run');
const MAPPING_ONLY = process.argv.includes('--mapping-only');

/** id → filename when default id_to_words.png does not match disk */
const BOON_FILE_ALIASES = {
    charons_ferry_fare: 'charon ferry fare.png',
    achilles_heel: 'achilles heel.png',
    forge_of_hephaestus: 'forge of hephaestus.png',
    prometheus_gift: 'prometheus gift.png',
    mt_olympus: 'Mt Olympus.png',
};

/** Prefer correctly spelled file when duplicates exist */
const FILE_FALLBACKS = {
    achilles_heel: ['achilles heel.png', 'achiles heel.png'],
    forge_of_hephaestus: ['forge of hephaestus.png', 'forge of hephestus.png'],
    prometheus_gift: ['prometheus gift.png', 'promethues gift.png'],
    mt_olympus: ['Mt Olympus.png', 'mt_olympus_boon.png'],
};

function loadBoonIds() {
    const src = fs.readFileSync(GAME_DATA_PATH, 'utf8');
    const section = src.match(/boons:\s*\[([\s\S]*?)\],\s*\n\s*worship:/);
    if (!section) throw new Error('Could not parse boons section in gameData.js');
    return [...section[1].matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1]);
}

function listArtPngs() {
    return new Set(
        fs.readdirSync(ART_DIR).filter((f) => f.toLowerCase().endsWith('.png'))
    );
}

function defaultFilename(id) {
    return `${id.replace(/_/g, ' ')}.png`;
}

function resolveFilename(id, artFiles) {
    if (BOON_FILE_ALIASES[id] && artFiles.has(BOON_FILE_ALIASES[id])) {
        return BOON_FILE_ALIASES[id];
    }

    const candidates = FILE_FALLBACKS[id] || [defaultFilename(id)];
    for (const name of candidates) {
        if (artFiles.has(name)) return name;
        const lower = name.toLowerCase();
        for (const file of artFiles) {
            if (file.toLowerCase() === lower) return file;
        }
    }
    return null;
}

function buildBoonMapping(boonIds, artFiles) {
    /** @type {Record<string, string>} */
    const mapping = {};
    /** @type {string[]} */
    const missing = [];

    for (const id of boonIds) {
        const file = resolveFilename(id, artFiles);
        if (file) mapping[id] = file;
        else missing.push(id);
    }
    return { mapping, missing };
}

/**
 * @param {Buffer} input
 * @returns {Promise<Buffer>}
 */
async function processBoonImage(input) {
    let buf = await sharp(input).trim({ threshold: TRIM_THRESHOLD }).toBuffer();
    let meta = await sharp(buf).metadata();
    let ratio = meta.width / meta.height;

    if (ratio > CARD_RATIO * 1.12) {
        const cropW = Math.round(meta.height * CARD_RATIO);
        const left = Math.max(0, Math.round((meta.width - cropW) / 2));
        buf = await sharp(buf)
            .extract({ left, top: 0, width: Math.min(cropW, meta.width - left), height: meta.height })
            .toBuffer();
    } else if (ratio < CARD_RATIO / 1.12) {
        const cropH = Math.round(meta.width / CARD_RATIO);
        const top = Math.max(0, Math.round((meta.height - cropH) / 2));
        buf = await sharp(buf)
            .extract({ left: 0, top, width: meta.width, height: Math.min(cropH, meta.height - top) })
            .toBuffer();
    }

    const innerW = TARGET_W - PADDING * 2;
    const innerH = TARGET_H - PADDING * 2;
    const resized = await sharp(buf).resize(innerW, innerH, { fit: 'inside' }).toBuffer();

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

function writeAssetMapping(mapping) {
    let code = fs.readFileSync(ASSET_MAPPING_PATH, 'utf8');
    const lines = Object.entries(mapping)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, file]) => `        '${id}': '${file}',`)
        .join('\n');

    const block = `    boons: {\n${lines}\n    },`;
    const replaced = code.replace(/    boons:\s*\{[\s\S]*?\n    \},/, block);
    if (replaced === code) throw new Error('Could not replace boons block in assetMapping.js');
    if (!DRY_RUN) fs.writeFileSync(ASSET_MAPPING_PATH, replaced);
}

async function processFile(filename) {
    const filePath = path.join(ART_DIR, filename);
    const before = await sharp(filePath).metadata();
    const beforeBytes = fs.statSync(filePath).size;

    if (DRY_RUN || MAPPING_ONLY) {
        const out = await processBoonImage(fs.readFileSync(filePath));
        const after = await sharp(out).metadata();
        const reduction = 1 - (after.width * after.height) / (before.width * before.height);
        return {
            filename,
            before: `${before.width}x${before.height}`,
            after: `${after.width}x${after.height}`,
            bytes: `${beforeBytes} → ${out.length}`,
            note: reduction > 0.5 ? 'trimmed' : ratioNote(before.width, before.height),
        };
    }

    const tmp = `${filePath}.trim-tmp.png`;
    const out = await processBoonImage(fs.readFileSync(filePath));
    fs.writeFileSync(tmp, out);
    const after = await sharp(tmp).metadata();
    fs.renameSync(tmp, filePath);
    return {
        filename,
        before: `${before.width}x${before.height}`,
        after: `${after.width}x${after.height}`,
        bytes: `${beforeBytes} → ${out.length}`,
    };
}

function ratioNote(w, h) {
    const r = w / h;
    if (r > CARD_RATIO * 1.12) return 'center-cropped wide';
    if (r < CARD_RATIO / 1.12) return 'center-cropped tall';
    return 'normalized';
}

async function main() {
    if (!fs.existsSync(ART_DIR)) {
        console.error('ART folder not found:', ART_DIR);
        process.exit(1);
    }

    const boonIds = loadBoonIds();
    const artFiles = listArtPngs();
    const { mapping, missing } = buildBoonMapping(boonIds, artFiles);

    console.log(`[trim-boon-art] ${DRY_RUN ? 'DRY RUN — ' : ''}${MAPPING_ONLY ? 'mapping only — ' : ''}${boonIds.length} boons, ${Object.keys(mapping).length} art files resolved`);

    if (missing.length) {
        console.warn('[trim-boon-art] Missing art for:', missing.join(', '));
    }

    writeAssetMapping(mapping);
    console.log(`[trim-boon-art] assetMapping.js ${DRY_RUN ? 'would update' : 'updated'} (${Object.keys(mapping).length} entries)`);

    if (MAPPING_ONLY) return;

    const uniqueFiles = [...new Set(Object.values(mapping))];
    let ok = 0;
    let fail = 0;

    for (const filename of uniqueFiles.sort()) {
        try {
            const result = await processFile(filename);
            console.log(`  ${result.filename}: ${result.before} → ${result.after} (${result.bytes})${result.note ? ` [${result.note}]` : ''}`);
            ok += 1;
        } catch (err) {
            console.error(`  FAIL ${filename}:`, err.message);
            fail += 1;
        }
    }

    console.log('');
    console.log(`[trim-boon-art] Done: ${ok} processed, ${fail} failed`);
    if (DRY_RUN) console.log('[trim-boon-art] Dry run — no image or mapping files written.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
