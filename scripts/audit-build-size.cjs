'use strict';
/**
 * Report build / public folder size by category and largest files.
 * Usage: npm run audit:size
 *        npm run audit:size -- dist
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const target = path.resolve(root, process.argv[2] || 'dist');

function fmtBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function walkFiles(dir) {
    /** @type {{ rel: string, size: number, ext: string }[]} */
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...walkFiles(full));
        } else if (entry.isFile()) {
            const st = fs.statSync(full);
            out.push({
                rel: path.relative(target, full).replace(/\\/g, '/'),
                size: st.size,
                ext: path.extname(entry.name).toLowerCase() || '(none)',
            });
        }
    }
    return out;
}

function main() {
    if (!fs.existsSync(target)) {
        console.error(`[audit:size] Not found: ${path.relative(root, target)}`);
        console.error('[audit:size] Run npm run build first, or pass a folder path.');
        process.exit(1);
    }

    const files = walkFiles(target);
    const total = files.reduce((s, f) => s + f.size, 0);

    /** @type {Map<string, number>} */
    const byExt = new Map();
    /** @type {Map<string, number>} */
    const byBucket = new Map();
    for (const f of files) {
        byExt.set(f.ext, (byExt.get(f.ext) || 0) + f.size);
        let bucket = 'other';
        if (f.rel.includes('/Music/') || f.ext === '.mp3') bucket = 'music';
        else if (f.ext === '.png') bucket = 'png';
        else if (f.ext === '.ogg') bucket = 'ogg';
        else if (f.ext === '.js') bucket = 'js';
        else if (f.ext === '.css') bucket = 'css';
        byBucket.set(bucket, (byBucket.get(bucket) || 0) + f.size);
    }

    console.log(`[audit:size] ${path.relative(root, target)} — ${files.length} files, ${fmtBytes(total)} total\n`);

    console.log('By type:');
    [...byExt.entries()].sort((a, b) => b[1] - a[1]).forEach(([ext, size]) => {
        const pct = ((size / total) * 100).toFixed(1);
        console.log(`  ${fmtBytes(size).padStart(10)}  (${pct.padStart(5)}%)  ${ext}`);
    });

    console.log('\nBy bucket:');
    [...byBucket.entries()].sort((a, b) => b[1] - a[1]).forEach(([bucket, size]) => {
        const pct = ((size / total) * 100).toFixed(1);
        console.log(`  ${fmtBytes(size).padStart(10)}  (${pct.padStart(5)}%)  ${bucket}`);
    });

    console.log('\nLargest 20 files:');
    files.sort((a, b) => b.size - a.size).slice(0, 20).forEach((f) => {
        console.log(`  ${fmtBytes(f.size).padStart(10)}  ${f.rel}`);
    });
}

main();
