'use strict';
/**
 * Unpack Microsoft's WebView2 fixed-version runtime into src-tauri/webview2-runtime/
 * so the Steam build can ship it beside the executable.
 *
 * Microsoft serves the .cab from a per-version CDN URL with no stable alias, so the
 * download stays manual:
 *   https://developer.microsoft.com/microsoft-edge/webview2/  →  "Fixed Version" → x64
 *
 * Usage: npm run setup:webview2 -- <path-to-.cab>
 *        npm run setup:webview2            (verifies an already-unpacked runtime)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'src-tauri', 'webview2-runtime');
const SENTINEL = 'msedgewebview2.exe';

const DOWNLOAD_HINT = [
    'Download the runtime first:',
    '  1. Open https://developer.microsoft.com/microsoft-edge/webview2/',
    '  2. Under "Fixed Version", choose the x64 build and download the .cab',
    '  3. Re-run: npm run setup:webview2 -- "C:\\path\\to\\Microsoft.WebView2.FixedVersionRuntime.<ver>.x64.cab"',
].join('\n');

function dirSizeBytes(dir) {
    let total = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) total += dirSizeBytes(full);
        else if (entry.isFile()) total += fs.statSync(full).size;
    }
    return total;
}

/** The .cab unpacks to a single versioned folder; flatten it so the path stays stable. */
function flattenSingleChild(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (entries.length !== 1 || !entries[0].isDirectory()) return;

    const inner = path.join(dir, entries[0].name);
    if (!fs.existsSync(path.join(inner, SENTINEL))) return;

    for (const entry of fs.readdirSync(inner)) {
        fs.renameSync(path.join(inner, entry), path.join(dir, entry));
    }
    fs.rmdirSync(inner);
}

function verify() {
    if (!fs.existsSync(path.join(TARGET, SENTINEL))) return null;
    return { mb: (dirSizeBytes(TARGET) / 1048576).toFixed(0) };
}

function main() {
    const cab = process.argv[2];

    if (!cab) {
        const found = verify();
        if (found) {
            console.log(`[webview2] Runtime present at src-tauri/webview2-runtime (${found.mb} MB).`);
            return;
        }
        console.error('[webview2] No runtime unpacked yet and no .cab given.\n');
        console.error(DOWNLOAD_HINT);
        process.exit(1);
    }

    const cabPath = path.resolve(cab);
    if (!fs.existsSync(cabPath)) {
        console.error(`[webview2] Not found: ${cabPath}\n`);
        console.error(DOWNLOAD_HINT);
        process.exit(1);
    }

    fs.rmSync(TARGET, { recursive: true, force: true });
    fs.mkdirSync(TARGET, { recursive: true });

    console.log(`[webview2] Expanding ${path.basename(cabPath)} …`);
    const res = spawnSync('expand.exe', [cabPath, '-F:*', TARGET], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (res.status !== 0) {
        console.error(`[webview2] expand.exe failed:\n${res.stderr || res.stdout}`);
        process.exit(1);
    }

    flattenSingleChild(TARGET);

    const found = verify();
    if (!found) {
        console.error(`[webview2] Expanded, but ${SENTINEL} is missing — is this the Fixed Version cab?`);
        process.exit(1);
    }

    console.log(`[webview2] Ready: src-tauri/webview2-runtime (${found.mb} MB)`);
}

main();
