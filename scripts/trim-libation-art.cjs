'use strict';
/**
 * Normalize libation card art to the card footprint (see scripts/lib/card-art.cjs).
 *
 * Usage:
 *   npm run trim-libation-art                   # process every file in AssetMapping.libations
 *   npm run trim-libation-art:dry               # report only, no writes
 *   npm run trim-libation-art -- --zoom=1.08    # crop deeper into the cup frame
 *
 * Libation art ships square (512×512) with its frame drawn in, so the card ratio
 * crop already takes ~20% off the sides. It is not zoomed further on top of that.
 *
 * Originals are copied to art-backup/libations/ on first run (gitignored) —
 * cropping is destructive and this art is not in version control.
 */

const path = require('path');
const { ROOT, parseZoom, run } = require('./lib/card-art.cjs');

const DEFAULT_ZOOM = 1;

run({
    label: 'trim-libation-art',
    block: 'libations',
    zoom: parseZoom(process.argv, DEFAULT_ZOOM),
    backupDir: path.join(ROOT, 'art-backup', 'libations'),
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
