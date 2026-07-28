'use strict';
/**
 * Fit consumable stela to the left rail box (456×1080): fixed pediment + base caps,
 * shaft stretched to fill the remaining height.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.resolve(__dirname, '..', 'game', 'public', 'ART', 'consumable-stela-pillar.png');
const OUT = SRC;
const TMP = `${OUT}.tmp.png`;

const TARGET_W = 456;
const TARGET_H = 1080;

/** Source slice heights (must match elongated asset layout) */
const SRC_TOP = 360;
const SRC_BOTTOM = 250;

/** Output cap heights — shaft gets the rest */
const OUT_TOP = 300;
const OUT_BOTTOM = 200;
const OUT_MID = TARGET_H - OUT_TOP - OUT_BOTTOM;

async function main() {
    if (!fs.existsSync(SRC)) {
        console.error('Missing source:', SRC);
        process.exit(1);
    }

    const meta = await sharp(SRC).metadata();
    const srcW = meta.width;
    const srcH = meta.height;
    const srcMid = srcH - SRC_TOP - SRC_BOTTOM;
    if (srcMid < 80) {
        console.error('Unexpected source layout:', srcW, srcH);
        process.exit(1);
    }

    const topBuf = await sharp(SRC)
        .extract({ left: 0, top: 0, width: srcW, height: SRC_TOP })
        .resize({ width: TARGET_W, height: OUT_TOP, fit: 'fill' })
        .toBuffer();
    const midBuf = await sharp(SRC)
        .extract({ left: 0, top: SRC_TOP, width: srcW, height: srcMid })
        .resize({ width: TARGET_W, height: OUT_MID, fit: 'fill' })
        .toBuffer();
    const botBuf = await sharp(SRC)
        .extract({ left: 0, top: srcH - SRC_BOTTOM, width: srcW, height: SRC_BOTTOM })
        .resize({ width: TARGET_W, height: OUT_BOTTOM, fit: 'fill' })
        .toBuffer();

    await sharp({
        create: {
            width: TARGET_W,
            height: TARGET_H,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([
            { input: topBuf, top: 0, left: 0 },
            { input: midBuf, top: OUT_TOP, left: 0 },
            { input: botBuf, top: OUT_TOP + OUT_MID, left: 0 },
        ])
        .png({ compressionLevel: 9 })
        .toFile(TMP);

    fs.renameSync(TMP, OUT);
    console.log(
        `[fit-consumable-stela-to-rail] ${srcW}x${srcH} → ${TARGET_W}x${TARGET_H} (shaft ${OUT_MID}px)`
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
