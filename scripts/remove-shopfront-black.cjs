'use strict';
/**
 * Conservative shop backdrop removal — edge letterbox black only (no halo peel).
 * Usage: node scripts/remove-shopfront-black.cjs
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const INPUT = path.resolve(__dirname, '..', 'game', 'public', 'ART', 'shopfront-boons-libations.png');
const BACKDROP_MAX = 18;

function isLetterboxBlack(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max <= BACKDROP_MAX && max - min <= 6;
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

async function main() {
    if (!fs.existsSync(INPUT)) {
        console.error('Missing:', INPUT);
        process.exit(1);
    }
    const { data, info } = await sharp(INPUT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cleared = floodLetterbox(data, info.width, info.height);
    const tmp = `${INPUT}.tmp.png`;
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png({ compressionLevel: 9 })
        .toFile(tmp);
    fs.renameSync(tmp, INPUT);
    console.log(`[remove-shopfront-black] keyed ${cleared}px letterbox (${info.width}x${info.height}), no halo peel`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
