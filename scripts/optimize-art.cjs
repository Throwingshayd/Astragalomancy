'use strict';
/**
 * Resize and recompress PNG art under game/public/ART for faster load / decode.
 * Keeps filenames and paths unchanged so AssetMapping and CSS keep working.
 *
 * Usage: npm run optimize-art
 *        npm run optimize-art -- --dry-run
 */

const fs = require('fs');
const path = require('path');

const ART_ROOT = path.resolve(__dirname, '..', 'game', 'public', 'ART');
const DRY_RUN = process.argv.includes('--dry-run');

/** @type {Array<{ test: (rel: string) => boolean, max: number }>} */
const RULES = [
    { test: (rel) => /(^|\/)die face \d+\.png$/i.test(rel) || rel.endsWith('dice face question mark.png'), max: 256 },
    { test: (rel) => rel.includes('/Music/'), max: 0 },
    { test: (rel) => /(dice table|game-board|play-stela|pantheon-frieze|shopfront|background swirl|Title art|in game title|column scroll)/i.test(rel), max: 1024 },
    { test: (rel) => rel.endsWith('.png'), max: 512 },
];

function maxFor(relPath) {
    for (const rule of RULES) {
        if (rule.test(relPath)) return rule.max;
    }
    return 512;
}

function walk(dir, base = ART_ROOT) {
    /** @type {string[]} */
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walk(full, base));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
            files.push(full);
        }
    }
    return files;
}

function fmtBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
    let sharp;
    try {
        sharp = require('sharp');
    } catch {
        console.error('Missing sharp — run: npm install');
        process.exit(1);
    }

    if (!fs.existsSync(ART_ROOT)) {
        console.error('ART folder not found:', ART_ROOT);
        process.exit(1);
    }

    const files = walk(ART_ROOT);
    let beforeTotal = 0;
    let afterTotal = 0;
    let changed = 0;
    let skipped = 0;

    console.log(`[optimize-art] ${DRY_RUN ? 'DRY RUN — ' : ''}Processing ${files.length} PNGs under ${ART_ROOT}`);

    for (const file of files) {
        const rel = path.relative(ART_ROOT, file).replace(/\\/g, '/');
        const max = maxFor(rel);
        if (max === 0) {
            skipped += 1;
            continue;
        }

        const before = fs.statSync(file).size;
        beforeTotal += before;

        const meta = await sharp(file).metadata();
        const w = meta.width || 0;
        const h = meta.height || 0;
        const needsResize = w > max || h > max;

        let pipeline = sharp(file);
        if (needsResize) {
            pipeline = pipeline.resize(max, max, { fit: 'inside', withoutEnlargement: true });
        }
        pipeline = pipeline.png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: false,
        });

        const buf = await pipeline.toBuffer();
        afterTotal += buf.length;

        if (buf.length >= before && !needsResize) {
            afterTotal = afterTotal - buf.length + before;
            continue;
        }

        changed += 1;
        const pct = before ? (((before - buf.length) / before) * 100).toFixed(1) : '0';
        console.log(
            `  ${rel}: ${w}x${h} ${fmtBytes(before)} → ${fmtBytes(buf.length)} (${pct}%${needsResize ? ', resized' : ''})`
        );

        if (!DRY_RUN) {
            fs.writeFileSync(file, buf);
        }
    }

    const saved = beforeTotal - afterTotal;
    console.log('');
    console.log(`[optimize-art] Changed: ${changed}, skipped (Music/non-png rules): ${skipped}`);
    console.log(`[optimize-art] PNG total: ${fmtBytes(beforeTotal)} → ${fmtBytes(afterTotal)} (saved ${fmtBytes(saved)})`);
    if (DRY_RUN) console.log('[optimize-art] Dry run — no files written.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
