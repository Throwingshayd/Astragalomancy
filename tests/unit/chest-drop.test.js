/**
 * The artifacts chest is the shop's buy target for artifacts and packs, and it is no
 * longer an inventory — owned artifacts live in the pause menu's Run Info tab.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8')
        .replace(
            `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
            `globalThis.${exportName} = ${exportName};`,
        );
    // eslint-disable-next-line no-eval
    eval(src);
}

function makeChest(rect = { left: 100, right: 300, top: 400, bottom: 560 }) {
    const classes = new Set();
    const chest = {
        classes,
        getBoundingClientRect: () => rect,
        classList: {
            add: (...n) => n.forEach((x) => classes.add(x)),
            remove: (...n) => n.forEach((x) => classes.delete(x)),
            contains: (x) => classes.has(x),
            toggle: (x, on) => (on ? classes.add(x) : classes.delete(x)),
        },
    };
    globalThis.document = { getElementById: (id) => (id === 'artifactsChest' ? chest : null) };
    return chest;
}

describe('ChestDrop', () => {
    beforeAll(() => {
        globalThis.window = globalThis;
        globalThis.document = { getElementById: () => null };
        loadScript('game/js/ui/drag/ChestDrop.js', 'ChestDrop');
    });

    it('claims artifact and pack buys, and leaves the inventory rails alone', () => {
        const c = globalThis.ChestDrop;
        expect(c.accepts('artifact')).toBe(true);
        expect(c.accepts('packShelf')).toBe(true);
        expect(c.accepts('direct')).toBe(false);
        expect(c.accepts('packReveal')).toBe(false);
    });

    it('hit-tests the chest box with a forgiving pad', () => {
        const c = globalThis.ChestDrop;
        makeChest();
        expect(c.contains(200, 480)).toBe(true);
        // Just outside the box but inside CATCH_PAD still counts.
        expect(c.contains(94, 480)).toBe(true);
        expect(c.contains(60, 480)).toBe(false);
        expect(c.contains(200, 600)).toBe(false);
    });

    it('opens the lid only while the pointer is inside, and shuts it on clear', () => {
        const c = globalThis.ChestDrop;
        const chest = makeChest();

        c.markTargets('artifact');
        expect(chest.classes.has('shop-drop-glow')).toBe(true);
        expect(chest.classes.has('is-open')).toBe(false);

        c.updateHot('artifact', 200, 480);
        expect(chest.classes.has('is-open')).toBe(true);
        expect(chest.classes.has('shop-drop-target-hot')).toBe(true);

        // Dragging back out shuts it again rather than latching open.
        c.updateHot('artifact', 900, 480);
        expect(chest.classes.has('is-open')).toBe(false);

        c.updateHot('artifact', 200, 480);
        c.clearTargets();
        expect(chest.classes.has('is-open')).toBe(false);
        expect(chest.classes.has('shop-drop-glow')).toBe(false);
        expect(chest.classes.has('shop-drop-target-hot')).toBe(false);
    });

    it('ignores drags that belong to another target', () => {
        const c = globalThis.ChestDrop;
        const chest = makeChest();
        c.markTargets('direct');
        c.updateHot('direct', 200, 480);
        expect(chest.classes.size).toBe(0);
    });
});

describe('the chest is no longer an artifact inventory', () => {
    it('nothing renders artifact cards into the chest any more', () => {
        const renderer = readFileSync('game/js/ui/renderers/PlayAreaRenderer.js', 'utf8');
        const html = readFileSync('game/index.html', 'utf8');

        expect(renderer).not.toContain('updateArtifactUI');
        expect(renderer).not.toContain('bindArtifactsChest');
        expect(html).not.toContain('id="artifactSlots"');
        expect(html).not.toContain('artifacts-chest-toggle');
        expect(html).toContain('js/ui/drag/ChestDrop.js');
    });

    it('Run Info shows owned artifacts as cards, since that is the only place left', () => {
        const runInfo = readFileSync('game/js/ui/RunInfoOverlay.js', 'utf8');
        const styles = readFileSync('game/css/styles.css', 'utf8');

        expect(runInfo).toContain('new Artifact(data)).render(false, false)');
        expect(runInfo).toContain("classList.add('run-info-artifact-card')");
        expect(styles).toContain('.run-info-artifact-row .run-info-artifact-card');
    });
});
