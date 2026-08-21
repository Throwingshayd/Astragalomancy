'use strict';
/**
 * Production build + itch.io upload zip.
 * Output: DiceOfDionysus-itchio.zip (index.html at zip root — upload as HTML project).
 *
 * Run: npm run build:itch
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const outZip = path.join(root, 'DiceOfDionysus-itchio.zip');

function run(cmd, opts = {}) {
    execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
}

function assertDistReady() {
    const indexHtml = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexHtml)) {
        console.error('[build:itch] dist/index.html missing — build failed?');
        process.exit(1);
    }
}

function zipDist() {
    if (fs.existsSync(outZip)) {
        fs.unlinkSync(outZip);
    }

    if (process.platform === 'win32') {
        const distGlob = path.join(distDir, '*');
        run(
            `powershell -NoProfile -Command "Compress-Archive -Path '${distGlob}' -DestinationPath '${outZip}' -Force"`,
        );
    } else {
        run(`zip -r "${outZip}" .`, { cwd: distDir });
    }

    const mb = (fs.statSync(outZip).size / (1024 * 1024)).toFixed(1);
    console.log(`\n[build:itch] Wrote ${path.basename(outZip)} (${mb} MB)`);
    console.log('[build:itch] Upload to itch.io → Create new project → Kind: HTML');
    console.log('[build:itch] Check “This file will be played in the browser”, embed ~1280×720, landscape.');
    console.log(`[build:itch] See docs/DEPLOY_ITCH.md for full steps.\n`);
}

function main() {
    console.log('[build:itch] Ensuring art junctions…');
    run('node scripts/ensure-art-junction.cjs');

    console.log('[build:itch] Pruning orphaned release assets…');
    run('node scripts/prune-release-assets.cjs');

    console.log('[build:itch] Optimizing PNG art…');
    run('node scripts/optimize-art.cjs');

    console.log('[build:itch] Running production build…');
    run('npm run build');

    assertDistReady();
    run('node scripts/trim-dist-release.cjs');
    zipDist();
    run('node scripts/audit-build-size.cjs dist');
}

main();
