'use strict';
/** Trim transparent padding only — safe after Photoshop export. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.resolve(__dirname, '..', 'game', 'public', 'ART');
const FILES = ['artifacts-chest-closed.png', 'artifacts-chest-open.png'];

async function trimFile(name) {
    const file = path.join(OUT_DIR, name);
    const tmp = `${file}.tmp.png`;
    const before = await sharp(file).metadata();
    await sharp(file).trim({ threshold: 8 }).png({ compressionLevel: 9 }).toFile(tmp);
    const after = await sharp(tmp).metadata();
    fs.renameSync(tmp, file);
    console.log(`${name}: ${before.width}x${before.height} → ${after.width}x${after.height}`);
}

async function main() {
    for (const f of FILES) await trimFile(f);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
