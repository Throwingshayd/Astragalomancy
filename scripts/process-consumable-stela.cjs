'use strict';
/** Key edge-connected black backdrop from consumable stela PNG → transparent alpha. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.resolve(__dirname, '..', 'game', 'public', 'ART', 'consumable-stela-pillar.png');
const SRC = process.argv[2]
    ? path.resolve(process.argv[2])
    : OUT;

const BACKDROP_MAX = 28;

function isBackdrop(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max <= BACKDROP_MAX && max - min <= 10;
}

function floodBackdrop(data, width, height) {
    const visited = new Uint8Array(width * height);
    const queue = [];
    const push = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const i = y * width + x;
        if (visited[i]) return;
        const p = i * 4;
        if (data[p + 3] === 0) return;
        if (!isBackdrop(data[p], data[p + 1], data[p + 2])) return;
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
    if (!fs.existsSync(SRC)) {
        console.error('Missing source:', SRC);
        process.exit(1);
    }
    const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cleared = floodBackdrop(data, info.width, info.height);
    const tmp = `${OUT}.tmp.png`;
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png({ compressionLevel: 9 })
        .toFile(tmp);
    fs.renameSync(tmp, OUT);
    console.log(`[process-consumable-stela] ${info.width}x${info.height} → ${OUT} (keyed ${cleared}px)`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
