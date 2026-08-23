import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function loadExports(path, names) {
    const src = readFileSync(path, 'utf8');
    return Function(`${src}; return { ${names.join(', ')} };`)();
}

const { PlayerTitles } = loadExports('game/js/config/PlayerTitles.js', ['PlayerTitles']);

describe('PlayerTitles', () => {
    it('keeps face rows as numbers', () => {
        expect(PlayerTitles.display('Ones')).toBe('Ones');
        expect(PlayerTitles.display('Sevens')).toBe('Sevens');
    });

    it('renames the special hands', () => {
        expect(PlayerTitles.display('Three of a Kind')).toBe('The Anvil');
        expect(PlayerTitles.display('Four of a Kind')).toBe('The Spoils');
        expect(PlayerTitles.display('Full House')).toBe('The Feast');
        expect(PlayerTitles.display('Small Straight')).toBe('The Short Road');
        expect(PlayerTitles.display('Large Straight')).toBe('The Long Course');
        expect(PlayerTitles.display('Extra Long Straight')).toBe('The Spectrum');
        expect(PlayerTitles.display('Yahtzee')).toBe('The House');
        expect(PlayerTitles.display('Chance')).toBe('Night');
        expect(PlayerTitles.display("Pandora's Jar")).toBe('The Jar');
    });

    it('scorecard HTML fallback chips use the player titles', () => {
        const html = readFileSync('game/index.html', 'utf8');
        expect(html).toContain('Night (Nyx)');
        expect(html).toContain('The Anvil (Hephaestus)');
        expect(html).toContain('The Short Road (Hermes)');
        expect(html).toContain('The Feast (Dionysus)');
        expect(html).toContain('The Spoils (Ares)');
        expect(html).toContain('The Long Course (Apollo)');
        expect(html).toContain('The Spectrum (Iris)');
        expect(html).toContain('The House (Hades)');
        expect(html).toContain('The Jar (Pandora)');
        expect(html).not.toContain('Five of a Kind (Hades)');
        expect(html).not.toContain('Chance (Nyx)');
    });
});
