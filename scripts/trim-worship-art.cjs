'use strict';
/**
 * Normalize worship card art to the card footprint (see scripts/lib/card-art.cjs).
 *
 * Usage:
 *   npm run trim-worship-art                    # process every file in AssetMapping.worship
 *   npm run trim-worship-art:dry                # report only, no writes
 *   npm run trim-worship-art -- --zoom=1.12     # crop deeper into the shrine frame
 *
 * Worship art is a shrine painting with its own drawn frame, so it is cropped a
 * little past the card edge — at zoom 1 the frame's outer moulding reads as a
 * border and the emblem inside sits smaller than a boon's illustration.
 *
 * Originals are copied to art-backup/worship/ on first run (gitignored) —
 * cropping is destructive and this art is not in version control.
 */

const path = require('path');
const { ROOT, parseZoom, run } = require('./lib/card-art.cjs');

const DEFAULT_ZOOM = 1.08;

run({
    label: 'trim-worship-art',
    block: 'worship',
    zoom: parseZoom(process.argv, DEFAULT_ZOOM),
    backupDir: path.join(ROOT, 'art-backup', 'worship'),
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
