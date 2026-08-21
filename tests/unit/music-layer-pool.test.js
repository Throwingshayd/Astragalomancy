import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('music pool — dual-bed layer, one rotation everywhere', () => {
    const poolSrc = readFileSync('game/js/data/musicPool.js', 'utf8');
    const soundSrc = readFileSync('game/js/ui/SoundManager.js', 'utf8');
    const shopSrc = readFileSync('game/js/ui/ShopUI.js', 'utf8');

    it('keeps base and layer pools separate', () => {
        expect(poolSrc).toContain('MUSIC_BASE_POOL');
        expect(poolSrc).toContain('MUSIC_LAYER_POOL');
        expect(poolSrc).not.toMatch(/MUSIC_POOL\s*=\s*\[\s*\.\.\.MUSIC_PHI_POOL\s*,\s*\.\.\.MUSIC_LAYER_POOL/);
    });

    it('SoundManager runs dual beds', () => {
        expect(soundSrc).toContain('MUSIC_BASE_TRACK_GAIN = 0.8');
        expect(soundSrc).toContain('_playNextBase');
        expect(soundSrc).toContain('_playNextLayer');
    });

    /** The shop used to stop the layer deck and loop a market track over the base bed. */
    it('no screen swaps the soundtrack', () => {
        for (const src of [poolSrc, soundSrc, shopSrc]) {
            expect(src).not.toContain('MUSIC_SHOP_TRACK_ID');
            expect(src).not.toContain('setMusicContext');
            expect(src).not.toContain('_musicContext');
        }
    });

    /** Reads the paths out of MUSIC_TRACKS so re-encoding the soundtrack can't silently
     *  leave the map pointing at files that no longer exist. */
    it('every track in MUSIC_TRACKS is present on disk', () => {
        const paths = [...poolSrc.matchAll(/'(ART\/Music\/[^']+)'/g)].map((m) => m[1]);
        expect(paths.length).toBeGreaterThan(0);

        for (const rel of paths) {
            expect(readFileSync(`game/public/${rel}`).byteLength).toBeGreaterThan(1000);
        }
    });

    it('covers both beds', () => {
        const ids = [...poolSrc.matchAll(/^\s{4}(\w+):\s*'ART\/Music\//gm)].map((m) => m[1]);
        expect(ids).toContain('phi_discovery');
        expect(ids).toContain('veil_of_ash');
    });
});
