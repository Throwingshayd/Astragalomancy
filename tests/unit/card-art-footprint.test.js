import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

/**
 * Consumable art must fill the card footprint, or the card renders visibly
 * smaller than its neighbours in the shop and consumable rails (art is drawn
 * with `background-size: contain`, so transparent letterboxing baked into the
 * PNG shrinks the card). `npm run trim-worship-art` / `trim-libation-art`
 * produce this; these fail if new art is dropped in without being run through.
 */
const ART_DIR = path.join('game', 'public', 'ART');
const MAPPING_PATH = path.join('game', 'js', 'data', 'assetMapping.js');
const CANVAS_W = 284;
const CANVAS_H = 380;
/** Soft/antialiased edges can leave a couple of near-transparent pixels. */
const SLACK = 6;
const OPAQUE = 8;

/** Bounding box of the visible pixels — transparent margin is what shrinks a card. */
async function paintedBox(file) {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = info.width;
    let right = -1;
    let top = info.height;
    let bottom = -1;
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            if (data[(y * info.width + x) * info.channels + 3] <= OPAQUE) continue;
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
        }
    }
    return { width: right - left + 1, height: bottom - top + 1 };
}

function mappedFilenames(block) {
    const src = readFileSync(MAPPING_PATH, 'utf8');
    const section = src.match(new RegExp(`    ${block}:\\s*\\{([\\s\\S]*?)\\n    \\},`));
    if (!section) throw new Error(`Could not parse ${block} block in assetMapping.js`);
    return [...new Set([...section[1].matchAll(/:\s*'([^']+\.png)'/g)].map((m) => m[1]))].sort();
}

describe.each(['worship', 'libations'])('%s art fills the card footprint', (block) => {
    mappedFilenames(block).forEach((filename) => {
        it(`${filename} is card-sized with no baked-in letterboxing`, async () => {
            const file = path.join(ART_DIR, filename);
            expect(existsSync(file), `${filename} is mapped but missing from ${ART_DIR}`).toBe(true);

            const canvas = await sharp(file).metadata();
            expect([canvas.width, canvas.height]).toEqual([CANVAS_W, CANVAS_H]);

            const art = await paintedBox(file);
            expect(art.width).toBeGreaterThanOrEqual(CANVAS_W - SLACK);
            expect(art.height).toBeGreaterThanOrEqual(CANVAS_H - SLACK);
        });
    });
});

describe('consumable art is not hidden by a frame overlay', () => {
    /**
     * `.card-frame` is an opaque coloured div painted above `.card-background`,
     * so a frame asset for a type whose art already has a frame drawn in blanks
     * out every card of that type (libations shipped that way).
     */
    it('worship and libation types render art instead of a frame element', () => {
        const src = readFileSync(MAPPING_PATH, 'utf8');
        const frames = src.match(/    frames:\s*\{([\s\S]*?)\n    \},/);
        expect(frames).not.toBeNull();
        expect(frames[1]).toMatch(/'worship':\s*null/);
        expect(frames[1]).toMatch(/'libation':\s*null/);
    });
});
