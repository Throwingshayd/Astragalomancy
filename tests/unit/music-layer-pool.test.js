import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('music pool — dual-bed layer + shop market', () => {
    const poolSrc = readFileSync('game/js/data/musicPool.js', 'utf8');
    const soundSrc = readFileSync('game/js/ui/SoundManager.js', 'utf8');

    it('keeps base and layer pools separate; market is shop-only', () => {
        expect(poolSrc).toContain('MUSIC_BASE_POOL');
        expect(poolSrc).toContain('MUSIC_LAYER_POOL');
        expect(poolSrc).toContain("market: 'ART/Music/layer/market.mp3'");
        expect(poolSrc).toContain('MUSIC_SHOP_TRACK_ID');
        expect(poolSrc).not.toMatch(/MUSIC_POOL\s*=\s*\[\s*\.\.\.MUSIC_PHI_POOL\s*,\s*\.\.\.MUSIC_LAYER_POOL/);
    });

    it('SoundManager runs dual beds and keeps base through shop', () => {
        expect(soundSrc).toContain('MUSIC_BASE_TRACK_GAIN = 0.8');
        expect(soundSrc).toContain('_playNextBase');
        expect(soundSrc).toContain('_playNextLayer');
        expect(soundSrc).toContain("Base bed never stops");
        expect(soundSrc).toContain('loop: true');
    });

    it('layer mp3 files are present on disk', () => {
        const files = [
            'game/public/ART/Music/layer/greek_tales.mp3',
            'game/public/ART/Music/layer/celtic_mystical.mp3',
            'game/public/ART/Music/layer/veil_of_ash.mp3',
            'game/public/ART/Music/layer/davids_vigilance.mp3',
            'game/public/ART/Music/layer/ancientone.mp3',
            'game/public/ART/Music/layer/market.mp3',
        ];
        for (const f of files) {
            expect(readFileSync(f).byteLength).toBeGreaterThan(1000);
        }
    });
});
