'use strict';
/**
 * Assemble a Steam depot folder: the bare executable plus the WebView2 runtime.
 *
 * Steam uploads a directory tree, not an installer, so this skips Tauri's NSIS/MSI
 * bundling entirely (`--no-bundle`) and lays the runtime out beside the exe where
 * WEBVIEW2_BROWSER_EXECUTABLE_FOLDER expects it.
 *
 * Usage: npm run build:steam
 *        npm run build:steam -- --skip-webview2   (local play/test only, not shippable)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RUNTIME_SRC = path.join(ROOT, 'src-tauri', 'webview2-runtime');
const OUT = path.join(ROOT, 'dist-steam');

const TAURI_CONF = JSON.parse(fs.readFileSync(path.join(ROOT, 'src-tauri', 'tauri.conf.json'), 'utf8'));
const EXE = `${TAURI_CONF.productName}.exe`;

/**
 * Tauri renames the binary to productName as part of installer bundling, which
 * `--no-bundle` skips — so cargo's own output is named after the crate. Accept either.
 */
function findBuiltExe() {
    const releaseDir = path.join(ROOT, 'src-tauri', 'target', 'release');
    const cargoName = /^name\s*=\s*"(.+)"/m.exec(
        fs.readFileSync(path.join(ROOT, 'src-tauri', 'Cargo.toml'), 'utf8')
    );

    const candidates = [EXE, cargoName ? `${cargoName[1]}.exe` : null].filter(Boolean);
    for (const name of candidates) {
        const full = path.join(releaseDir, name);
        if (fs.existsSync(full)) return full;
    }
    return null;
}

function fmtBytes(n) {
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(2)} MB`;
}

function dirSizeBytes(dir) {
    let total = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) total += dirSizeBytes(full);
        else if (entry.isFile()) total += fs.statSync(full).size;
    }
    return total;
}

function run(cmd, args) {
    const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    if (res.status !== 0) {
        console.error(`\n[steam] Failed: ${cmd} ${args.join(' ')}`);
        process.exit(res.status || 1);
    }
}

function main() {
    if (process.platform !== 'win32') {
        console.error('[steam] This builds the Windows depot and must run on Windows.');
        process.exit(1);
    }

    const skipRuntime = process.argv.includes('--skip-webview2');
    const haveRuntime = fs.existsSync(path.join(RUNTIME_SRC, 'msedgewebview2.exe'));

    if (!haveRuntime && !skipRuntime) {
        console.error('[steam] WebView2 runtime missing. Run: npm run setup:webview2 -- <path-to-.cab>');
        console.error('[steam] Or pass --skip-webview2 to build a local-only copy for testing.');
        process.exit(1);
    }

    console.log('[steam] Building executable (no installer bundling) …');
    // tauri-build validates the fixedRuntime resource path at compile time, so the Steam
    // config overlay can only be applied once the runtime is actually unpacked.
    const buildArgs = ['tauri', 'build', '--no-bundle'];
    if (haveRuntime) buildArgs.push('--config', 'src-tauri/tauri.steam.conf.json');
    run('npx', buildArgs);

    const exeSrc = findBuiltExe();
    if (!exeSrc) {
        console.error('[steam] No built executable found under src-tauri/target/release.');
        process.exit(1);
    }

    console.log('[steam] Assembling depot …');
    fs.rmSync(OUT, { recursive: true, force: true });
    fs.mkdirSync(OUT, { recursive: true });
    fs.copyFileSync(exeSrc, path.join(OUT, EXE));

    let runtimeBytes = 0;
    if (haveRuntime) {
        fs.cpSync(RUNTIME_SRC, path.join(OUT, 'webview2-runtime'), { recursive: true });
        runtimeBytes = dirSizeBytes(path.join(OUT, 'webview2-runtime'));
    }

    const exeBytes = fs.statSync(path.join(OUT, EXE)).size;

    console.log('');
    console.log(`[steam] Depot: ${path.relative(ROOT, OUT)}`);
    console.log(`  ${EXE.padEnd(24)} ${fmtBytes(exeBytes)}   (game + all assets embedded)`);
    if (haveRuntime) console.log(`  ${'webview2-runtime/'.padEnd(24)} ${fmtBytes(runtimeBytes)}`);
    console.log(`  ${'total'.padEnd(24)} ${fmtBytes(exeBytes + runtimeBytes)}`);
    console.log('');

    if (haveRuntime) {
        console.log(`[steam] Set the Steam launch option executable to: ${EXE}`);
    } else {
        console.log('[steam] WARNING: no WebView2 runtime bundled — runs only on machines that');
        console.log('[steam] already have WebView2. Fine for local play, NOT ready to ship.');
    }
}

main();
