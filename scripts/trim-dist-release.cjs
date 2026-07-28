'use strict';
/**
 * Strip dev-only / duplicate assets from production dist (after vite build).
 * Individual die PNGs remain in public/ for spritesheet generation.
 *
 * Usage: node scripts/trim-dist-release.cjs
 */

const fs = require('fs');
const path = require('path');

const DIST_ART = path.resolve(__dirname, '..', 'dist', 'ART');
const DIE_FACE = /^die face \d+\.png$/i;
const QUESTION = /^dice face question mark\.png$/i;

function fmtBytes(n) {
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function main() {
    if (!fs.existsSync(DIST_ART)) {
        console.warn('[trim-dist] dist/ART missing — skip');
        return;
    }

    let removed = 0;
    let saved = 0;
    for (const name of fs.readdirSync(DIST_ART)) {
        if (!DIE_FACE.test(name) && !QUESTION.test(name)) continue;
        const full = path.join(DIST_ART, name);
        if (!fs.statSync(full).isFile()) continue;
        const size = fs.statSync(full).size;
        fs.unlinkSync(full);
        removed += 1;
        saved += size;
        console.log(`[trim-dist] removed ART/${name} (${fmtBytes(size)})`);
    }

    console.log(`[trim-dist] ${removed} die-face PNG(s) removed, saved ${fmtBytes(saved)}`);
}

main();
