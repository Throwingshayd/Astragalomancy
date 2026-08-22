'use strict';
/**
 * Normalize artifact card art to the card footprint (see scripts/lib/card-art.cjs).
 *
 * Usage:
 *   npm run trim-artifact-art
 *   npm run trim-artifact-art:dry
 */

const path = require('path');
const { ROOT, parseZoom, run } = require('./lib/card-art.cjs');

run({
    label: 'trim-artifact-art',
    block: 'artifacts',
    zoom: parseZoom(process.argv, 1),
    backupDir: path.join(ROOT, 'art-backup', 'artifacts'),
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
