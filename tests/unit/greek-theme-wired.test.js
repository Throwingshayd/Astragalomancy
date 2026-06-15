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

    it('greek-theme.css defines marble pantheon frieze and side stelae', () => {
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
        expect(css).toContain('CONSUMABLES');
        expect(css).toContain('BOONS');
        expect(css).toContain('Greater Pantheon');
        expect(css).toContain('--gk-meander-v');
        expect(css).toContain('--gk-meander-h');
    });
});
