'use strict';
/**
 * Clean cut around artifacts chest: conservative edge key + trim + gold/bronze outline.
 * Usage: node scripts/process-artifacts-chest.cjs [source.png]
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
/** Only neutral letterbox black — avoids purple/shadow in the art */
const BACKDROP_MAX = 20;

function isLetterboxBlack(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max <= BACKDROP_MAX && max - min <= 8;
}

function floodLetterbox(data, width, height) {
    const visited = new Uint8Array(width * height);
    const queue = [];
    const push = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const i = y * width + x;
        if (visited[i]) return;
        const p = i * 4;
        if (data[p + 3] === 0) return;
        if (!isLetterboxBlack(data[p], data[p + 1], data[p + 2])) return;
        visited[i] = 1;
        queue.push(i);
    };
    for (let x = 0; x < width; x++) {
        push(x, 0);
        push(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
        push(0, y);
        push(width - 1, y);
    }
    let cleared = 0;
    while (queue.length) {
        const i = queue.pop();
        const x = i % width;
        const y = (i - x) / width;
        push(x - 1, y);
        push(x + 1, y);
        push(x, y - 1);
        push(x, y + 1);
    }
    for (let i = 0; i < width * height; i++) {
        if (!visited[i]) continue;
        data[i * 4 + 3] = 0;
        cleared += 1;
    }
    return cleared;
}

function paintOutline(data, width, height, r, g, b, radius) {
    const alpha = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) alpha[i] = data[i * 4 + 3];

    const outline = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            if (alpha[i] < 48) continue;
            let border = false;
            for (let dy = -radius; dy <= radius && !border; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) > radius) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                        border = true;
                        break;
                    }
                    if (alpha[ny * width + nx] < 48) {
                        border = true;
                        break;
                    }
                }
            }
            if (border) outline[i] = 1;
        }
    }

    let painted = 0;
    for (let i = 0; i < width * height; i++) {
        if (!outline[i]) continue;
        const p = i * 4;
        if (data[p + 3] >= 48) continue;
        data[p] = r;
        data[p + 1] = g;
        data[p + 2] = b;
        data[p + 3] = 255;
        painted += 1;
    }
    return painted;
}

async function processBuffer(inputBuffer, outName) {
    let pipeline = sharp(inputBuffer).ensureAlpha();
    let { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

    const cleared = floodLetterbox(data, info.width, info.height);
    paintOutline(data, info.width, info.height, 58, 38, 22, 2);
    paintOutline(data, info.width, info.height, 201, 162, 76, 1);

    const tmp = path.join(OUT_DIR, `${outName}.tmp.png`);
    await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 },
    })
        .trim({ threshold: 12 })
        .png({ compressionLevel: 9 })
        .toFile(tmp);

    const trimmed = await sharp(tmp).metadata();
    fs.renameSync(tmp, path.join(OUT_DIR, outName));
    console.log(`  → ${outName}: keyed ${cleared}px, trimmed ${info.width}x${info.height} → ${trimmed.width}x${trimmed.height}`);
}

async function main() {
    if (!fs.existsSync(SOURCE)) {
        console.error('Source not found:', SOURCE);
        process.exit(1);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const meta = await sharp(SOURCE).metadata();
    const half = Math.floor(meta.width / 2);
    console.log(`[process-artifacts-chest] ${meta.width}x${meta.height}`);

    const full = await sharp(SOURCE).ensureAlpha().png().toBuffer();
    const left = await sharp(full).extract({ left: 0, top: 0, width: half, height: meta.height }).png().toBuffer();
    const right = await sharp(full).extract({ left: half, top: 0, width: meta.width - half, height: meta.height }).png().toBuffer();

    await processBuffer(left, 'artifacts-chest-closed.png');
    await processBuffer(right, 'artifacts-chest-open.png');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
