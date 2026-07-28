'use strict';
/**
 * Extend consumable stela pillar shafts (middle marble/columns) while keeping
 * pediment + grape base slices unchanged. Output is taller composition, same width.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.resolve(__dirname, '..', 'game', 'public', 'ART', 'consumable-stela-pillar.png');
const OUT = SRC;
const TMP = `${OUT}.tmp.png`;

/** Pediment through capitals — do not stretch */
const TOP_H = 360;
/** Grape base — do not stretch */
const BOTTOM_H = 250;
/** Extra shaft length to add (design pixels) */
const SHAFT_EXTRA = 420;

async function main() {
    if (!fs.existsSync(SRC)) {
        console.error('Missing source:', SRC);
        process.exit(1);
    }

    const meta = await sharp(SRC).metadata();
    const srcH = meta.height;
    const srcW = meta.width;
    const middleH = srcH - TOP_H - BOTTOM_H;
    if (middleH < 80) {
        console.error('Source too short for slice layout:', srcW, srcH);
        process.exit(1);
    }

    const outH = TOP_H + middleH + SHAFT_EXTRA + BOTTOM_H;

    const topBuf = await sharp(SRC).extract({ left: 0, top: 0, width: srcW, height: TOP_H }).toBuffer();
    const midBuf = await sharp(SRC)
        .extract({ left: 0, top: TOP_H, width: srcW, height: middleH })
        .resize({ width: srcW, height: middleH + SHAFT_EXTRA, fit: 'fill' })
        .toBuffer();
    const botBuf = await sharp(SRC)
        .extract({ left: 0, top: srcH - BOTTOM_H, width: srcW, height: BOTTOM_H })
        .toBuffer();

    await sharp({
        create: {
            width: srcW,
            height: outH,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([
            { input: topBuf, top: 0, left: 0 },
            { input: midBuf, top: TOP_H, left: 0 },
            { input: botBuf, top: TOP_H + middleH + SHAFT_EXTRA, left: 0 },
        ])
        .png({ compressionLevel: 9 })
        .toFile(TMP);

    fs.renameSync(TMP, OUT);
    console.log(`[elongate-consumable-stela] ${srcW}x${srcH} → ${srcW}x${outH} (+${SHAFT_EXTRA}px shaft)`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
