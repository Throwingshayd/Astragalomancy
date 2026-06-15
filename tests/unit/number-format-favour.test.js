import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll } from 'vitest';

describe('NumberFormat favour / mult display', () => {
    beforeAll(() => {
        const src = readFileSync('game/js/utils/NumberFormat.js', 'utf8')
            .replace('/* exported NumberFormat */', '')
            .replace('if (typeof window !== \'undefined\') window.NumberFormat = NumberFormat;', 'globalThis.NumberFormat = NumberFormat;');
        // eslint-disable-next-line no-eval
        eval(src);
    });

    it('shows ×1.25 not ×1.3 for quarter mults', () => {
        expect(globalThis.NumberFormat.favour(1.25)).toBe('×1.25');
        expect(globalThis.NumberFormat.favour(1 + 0.25)).toBe('×1.25');
    });

    it('formats integer mults with × prefix', () => {
        expect(globalThis.NumberFormat.favour(2)).toBe('×2');
    });

    it('contrib keeps fractional quarters without ×', () => {
        expect(globalThis.NumberFormat.favourContrib(0.25)).toBe('0.25');
    });
});
