import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Both side pillars are vertical overlapping stacks. The boon one has its own
 * top/height because artifacts can push the run to seven boons, and it fans
 * tighter past six rather than running off the bottom of the 1080px stage.
 * Hovering either pillar lifts one card clear of the stack. Measured geometry
 * lives in tests/e2e/greek-layout-visual.spec.js; this only guards the wiring.
 */

describe('side card rails', () => {
    it('gives the boon pillar its own top and height vars', () => {
        const theme = readFileSync('game/css/greek-theme.css', 'utf8');
        const styles = readFileSync('game/css/styles.css', 'utf8');

        expect(theme).toContain('--boon-bar-top-main: 44px');
        expect(theme).toContain('--boon-bar-h: 1004px');
        expect(styles).toContain('top: var(--boon-bar-top-main, var(--side-bar-top-main, 260px))');
        expect(styles).toContain('height: var(--boon-bar-h, 780px)');
    });

    it('tightens the boon fan only once the stack passes six cards, first card pinned', () => {
        const styles = readFileSync('game/css/styles.css', 'utf8');
        expect(styles).toContain(
            '.right-boon-bar .boon-slots.card-area-squish.card-area-vertical:has(.card:nth-child(7)) .card:not(:first-child)'
        );
        expect(styles).toContain(
            '.right-boon-bar .boon-slots.card-area-squish.card-area-vertical:has(.card:nth-child(8)) .card:not(:first-child)'
        );
    });

    it('lifts the hovered card on both rails — a slide, not a scale', () => {
        const present = readFileSync('game/css/card-present.css', 'utf8');
        const lift = present.slice(present.indexOf('.right-boon-bar .boon-slots.card-area-vertical .card:hover'));

        expect(lift).toContain('.left-consumable-bar .consumable-slots.card-area-vertical .card:hover');
        expect(lift).toContain('transform: translateY(-18px) !important');
        expect(lift).toContain('z-index: 40');
        expect(lift).not.toContain('scale(');
    });

    it('keeps the lift off while a card is being dragged', () => {
        const present = readFileSync('game/css/card-present.css', 'utf8');
        const boonDrag = '.main-game.boon-drag-active .boon-slots .card:hover';
        const consumableDrag = '.main-game.consumable-drag-active .consumable-slots .card:hover';

        // Equal specificity to the lift rules, so the drag rules must come later.
        expect(present.indexOf(boonDrag)).toBeGreaterThan(present.indexOf('transform: translateY(-18px)'));
        expect(present.indexOf(consumableDrag)).toBeGreaterThan(present.indexOf('transform: translateY(-18px)'));
    });
});
