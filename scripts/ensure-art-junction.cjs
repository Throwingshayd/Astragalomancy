'use strict';
/**
 * Vite + Live Server serve from game/ as site root. Assets live under game/public/,
 * but absolute URLs like /ART/, /fonts/, /sounds/ only resolve if those folders
 * also exist under game/ (publicDir-at-root is unreliable with this layout).
 * This links game/<name> → game/public/<name> for each needed root path.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const gameRoot = path.resolve(__dirname, '..', 'game');
const JUNCTIONS = ['ART', 'fonts', 'sounds'];

function ensureJunction(name) {
    const target = path.join(gameRoot, 'public', name);
    const link = path.join(gameRoot, name);
    const tag = `[ensure-art-junction] game/${name}`;

    if (!fs.existsSync(target)) {
        console.warn(`${tag}: public/${name} missing — skip`);
        return;
    }
    if (fs.existsSync(link)) {
        try {
            if (fs.realpathSync(link) === fs.realpathSync(target)) {
                return;
            }
        } catch {
            /* broken link */
        }
        const st = fs.lstatSync(link);
        if (st.isSymbolicLink()) {
            fs.unlinkSync(link);
        } else if (st.isDirectory()) {
            const inner = fs.readdirSync(link);
            if (inner.length > 0) {
                console.warn(
                    `${tag} exists and is not empty — remove or rename it, then run again`
                );
                return;
            }
            fs.rmdirSync(link);
        } else {
            fs.unlinkSync(link);
        }
    }
    if (process.platform === 'win32') {
        execSync(`cmd /c mklink /J "${link}" "${target}"`, { stdio: 'inherit' });
    } else {
        const rel = path.relative(path.dirname(link), target);
        fs.symlinkSync(rel, link, 'dir');
    }
    console.log(`${tag} → public/${name}`);
}

function main() {
    for (const name of JUNCTIONS) {
        ensureJunction(name);
    }
}

main();
