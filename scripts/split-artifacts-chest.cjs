'use strict';
/**
 * Split artifacts chest sprite (closed | open) — no backdrop removal.
 * Usage: node scripts/split-artifacts-chest.cjs [source.png]
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE = process.argv[2]
    || path.resolve(
        process.env.USERPROFILE || '',
        '.cursor/projects/c-Users-Lorcan-Documents-DICE-OF-DIONYSUS-WORKING/assets/c__Users_Lorcan_AppData_Roaming_Cursor_User_workspaceStorage_caa0fffe63f8de766356f9a4197c35fe_images_artifacts_box-e4a6c1e8-97a9-4b64-8300-9d95c57693de.png',
    );
const OUT_DIR = path.resolve(__dirname, '..', 'game', 'public', 'ART');

async function splitHalf(input, left, cropWidth, outName) {
    const meta = await sharp(input).metadata();
    const outPath = path.join(OUT_DIR, outName);
    await sharp(input)
        .extract({ left, top: 0, width: cropWidth, height: meta.height })
        .png({ compressionLevel: 9 })
        .toFile(outPath);
    console.log(`  → ${outName} (${cropWidth}x${meta.height})`);
}

async function main() {
    if (!fs.existsSync(SOURCE)) {
        console.error('Source not found:', SOURCE);
        process.exit(1);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const meta = await sharp(SOURCE).metadata();
    const half = Math.floor(meta.width / 2);
    console.log(`[split-artifacts-chest] ${meta.width}x${meta.height} (raw split, no keying)`);
    await splitHalf(SOURCE, 0, half, 'artifacts-chest-closed.png');
    await splitHalf(SOURCE, half, meta.width - half, 'artifacts-chest-open.png');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
