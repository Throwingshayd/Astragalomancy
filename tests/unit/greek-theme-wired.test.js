import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Greek theme wiring', () => {
    it('index.html loads card-sizes and card-present after tooltips', () => {
        const html = readFileSync('game/index.html', 'utf8');
        const stylesIdx = html.indexOf('href="css/styles.css"');
        const greekIdx = html.indexOf('href="css/greek-theme.css"');
        const tooltipsIdx = html.indexOf('href="css/tooltips.css"');
        const cardSizesIdx = html.indexOf('href="css/card-sizes.css"');
        const cardPresentIdx = html.indexOf('href="css/card-present.css"');
        const visualIdx = html.indexOf('href="css/visual-tokens.css"');
        expect(stylesIdx).toBeGreaterThan(-1);
        expect(greekIdx).toBeGreaterThan(stylesIdx);
        expect(greekIdx).toBeGreaterThan(visualIdx);
        expect(tooltipsIdx).toBeGreaterThan(greekIdx);
        expect(cardSizesIdx).toBeGreaterThan(tooltipsIdx);
        expect(cardPresentIdx).toBeGreaterThan(cardSizesIdx);
    });

    it('greek-theme.css defines open-stage HUD and pantheon frieze', () => {
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        const tokens = readFileSync('game/css/visual-tokens.css', 'utf8');
        const fonts = readFileSync('game/css/fonts-morris.css', 'utf8');
        const styles = readFileSync('game/css/styles.css', 'utf8');
        expect(css).toContain('.main-game .pantheon-frieze');
        expect(css).toContain('var(--font-manuscript)');
        expect(tokens).toContain("--font-stack: 'Morris Roman'");
        expect(tokens).toContain('--color-title:');
        expect(fonts).toContain("font-family: 'Morris Roman'");
        expect(fonts).toContain('/fonts/MorrisRoman-Black.ttf');
        expect(tokens).toContain('--font-epic-title');
        expect(tokens).toContain('--font-pantheon-hand');
        expect(styles).toMatch(/\.pantheon-frieze \.pantheon-chip[\s\S]*font-family: var\(--font-pantheon-hand\)/);
        expect(css).toContain('felt-epic-title');
        expect(css).toContain('var(--gk-marble-1)');
        expect(css).toContain('Greater Pantheon');
        expect(css).toContain('--gk-meander-v');
        expect(css).toContain('--gk-meander-h');
        expect(css).toContain('.clepsydra');
        expect(css).toContain('.trial-banner');
        expect(css).toContain('.rolls-pips');
    });

    it('Kronos hourglass sits on the artifacts row with Roman numerals above', () => {
        const html = readFileSync('game/index.html', 'utf8');
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        const block = html.match(/id="clepsydra"[\s\S]*?id="rollsPips"/)[0];
        expect(block).not.toContain('clepsydra-label');
        expect(block.indexOf('clepsydra-readout')).toBeLessThan(block.indexOf('clepsydra-relic'));
        expect(block.indexOf('turnDisplay')).toBeLessThan(block.indexOf('clepsydra-relic'));
        expect(css).toMatch(
            /\.main-game \.center-game-area \.clepsydra \{[\s\S]*?left:\s*calc\(52px \+ 1\.5 \* var\(--felt-die-size, 95px\)\)/,
        );
        expect(css).toMatch(
            /\.main-game \.center-game-area \.clepsydra \{[\s\S]*?top:\s*calc\(468px - var\(--felt-die-size, 95px\)\)/,
        );
        expect(css).toMatch(
            /\.main-game \.center-game-area \.clepsydra-readout \{[\s\S]*?bottom:\s*100%[\s\S]*?translate\(-50%, var\(--felt-die-size, 95px\)\)/,
        );
    });

    it('shop Continue sits one die higher and gold has a marble plaque', () => {
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        expect(css).toMatch(
            /\.main-game\.shop-active \.center-game-area \.shop-continue-btn \{[\s\S]*?top:\s*calc\(590px - 2 \* var\(--felt-die-size, 95px\)\)/,
        );
        expect(css).toMatch(
            /\.main-game \.center-game-area \.felt-stone-gold \{[\s\S]*?felt-panel-marble/,
        );
    });

    it('Greater Pantheon combo chips are in bonus-chip order', () => {
        const html = readFileSync('game/index.html', 'utf8');
        const upper = html.match(/pantheon-tier-upper[\s\S]*?<\/div>\s*<!-- Lower tier/)[0];
        const cats = [...upper.matchAll(/data-category="([^"]+)"/g)].map((m) => m[1]);
        expect(cats).toEqual([
            'Chance',
            'Three of a Kind',
            'Small Straight',
            'Full House',
            'Four of a Kind',
            'Large Straight',
            'Yahtzee',
            "Pandora's Box",
        ]);
    });
});
