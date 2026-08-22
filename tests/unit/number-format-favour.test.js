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

    it('shows ×125 not ×1.25 for a worshipped row', () => {
        expect(globalThis.NumberFormat.favour(125)).toBe('×125');
        expect(globalThis.NumberFormat.favour(100 + 25)).toBe('×125');
    });

    it('formats integer Favour with × prefix', () => {
        expect(globalThis.NumberFormat.favour(200)).toBe('×200');
    });

    it('contrib keeps additive Favour without ×', () => {
        expect(globalThis.NumberFormat.favourContrib(25)).toBe('25');
    });
});
