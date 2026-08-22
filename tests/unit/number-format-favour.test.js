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

    it('shows ×1.25 not ×125 for a worshipped row', () => {
        expect(globalThis.NumberFormat.favour(125)).toBe('×1.25');
        expect(globalThis.NumberFormat.favour(100 + 25)).toBe('×1.25');
        expect(globalThis.NumberFormat.favour(100)).toBe('×1');
    });

    it('formats integer Favour with × prefix on the player scale', () => {
        expect(globalThis.NumberFormat.favour(200)).toBe('×2');
    });

    it('contrib keeps additive Favour without ×', () => {
        expect(globalThis.NumberFormat.favourContrib(25)).toBe('0.25');
        expect(globalThis.NumberFormat.favourContrib(200)).toBe('2');
    });
});
