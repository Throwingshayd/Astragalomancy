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

describe('dice inspect overlay', () => {
    beforeAll(() => {
        loadScript('game/js/ui/DiceInspectOverlay.js', 'DiceInspectOverlay');
    });

    it('shows one die-id column of real face art with hover tooltip data', () => {
        const html = globalThis.DiceInspectOverlay.renderBody({
            hasRolled: true,
            unlockedCategories: {},
            dice: [
                {
                    dieId: 4,
                    currentFace: 6,
                    faces: {
                        1: { value: 1, modifiedValue: 1, enhancements: new Set() },
                        2: { value: 2, modifiedValue: 2, enhancements: new Set() },
                        3: { value: 3, modifiedValue: 3, enhancements: new Set() },
                        4: { value: 4, modifiedValue: 4, enhancements: new Set() },
                        5: { value: 5, modifiedValue: 5, enhancements: new Set() },
                        6: { value: 6, modifiedValue: 6, enhancements: new Set(['iron']) },
                    },
                },
            ],
        });

        expect(html).toContain('data-die-id="4"');
        expect(html).toContain('Die 4');
        expect(html).toContain('class="die dice-inspect-face');
        expect(html).toContain('data-face="6"');
        expect(html).toContain('data-tooltip');
        expect(html).toContain('is-up');
        expect(html).toContain('iron');
    });

    it('lists dice by id and keeps 7–9 columns when those faces are unlocked', () => {
        const faces = {
            1: { value: 1, modifiedValue: 1, enhancements: new Set() },
            2: { value: 2, modifiedValue: 2, enhancements: new Set() },
            3: { value: 3, modifiedValue: 3, enhancements: new Set() },
            4: { value: 4, modifiedValue: 4, enhancements: new Set() },
            5: { value: 5, modifiedValue: 5, enhancements: new Set() },
            6: { value: 6, modifiedValue: 6, enhancements: new Set() },
        };
        const html = globalThis.DiceInspectOverlay.renderBody({
            hasRolled: false,
            unlockedCategories: { Sevens: true, Eights: true, Nines: true },
            dice: [
                { dieId: 5, currentFace: 0, faces },
                { dieId: 1, currentFace: 0, faces },
            ],
        });
        expect(html.indexOf('data-die-id="1"')).toBeLessThan(html.indexOf('data-die-id="5"'));
        expect(html).toContain('has-high-faces');
        expect(html).toContain('data-face="7"');
        expect(html).toContain('data-face="9"');
    });

    it('counts faces and enhancements, and hides 7–9 until each is unlocked', () => {
        const faces = {
            1: { value: 1, modifiedValue: 1, enhancements: new Set() },
            2: { value: 2, modifiedValue: 2, enhancements: new Set() },
            3: { value: 3, modifiedValue: 3, enhancements: new Set() },
            4: { value: 4, modifiedValue: 4, enhancements: new Set() },
            5: { value: 5, modifiedValue: 5, enhancements: new Set() },
            6: { value: 6, modifiedValue: 6, enhancements: new Set(['iron']) },
        };
        const locked = globalThis.DiceInspectOverlay.renderAside({
            unlockedCategories: {},
            dice: [{ dieId: 1, faces }, { dieId: 2, faces }],
        });
        expect(locked).toContain('>1<');
        expect(locked).toContain('×2');
        expect(locked).toContain('Enhancements');
        expect(locked).toContain('iron');
        expect(locked).toContain('parchment');
        expect(locked).toContain('gold');
        expect(locked).not.toContain('>7<');
        expect(locked).not.toContain('>8<');
        expect(locked).not.toContain('>9<');
        expect(locked).not.toContain('High faces');

        const sevens = globalThis.DiceInspectOverlay.renderAside({
            unlockedCategories: { Sevens: true },
            dice: [{ dieId: 1, faces }],
        });
        expect(sevens).toContain('>7<');
        expect(sevens).not.toContain('>8<');
        expect(sevens).not.toContain('>9<');
    });

    it('is the first pause Run Info tab', () => {
        const runInfo = readFileSync('game/js/ui/RunInfoOverlay.js', 'utf8');
        expect(runInfo.indexOf("{ id: 'dice', label: 'Dice' }")).toBeGreaterThan(-1);
        expect(runInfo.indexOf("{ id: 'dice', label: 'Dice' }"))
            .toBeLessThan(runInfo.indexOf("{ id: 'antes', label: 'Trials' }"));
        expect(runInfo).toContain('DiceInspectOverlay.renderBody');
        expect(runInfo).toContain('DiceInspectOverlay.renderAside');
    });

    it('has no table Inspect button — pause Dice tab is the inspect view', () => {
        const page = readFileSync('game/index.html', 'utf8');
        expect(page).not.toContain('diceInspectBtn');
        expect(page).not.toContain('Inspect dice');
        expect(page.indexOf('DiceInspectOverlay.js')).toBeLessThan(page.indexOf('RunInfoOverlay.js'));
        const renderer = readFileSync('game/js/ui/renderers/DiceRenderer.js', 'utf8');
        expect(renderer).not.toContain('bindInspectButton');
        expect(renderer).not.toContain('DiceInspectOverlay.show');
    });

    it('puts the die id under the table die, not in the score hover', () => {
        const renderer = readFileSync('game/js/ui/renderers/DiceRenderer.js', 'utf8');
        const tooltip = readFileSync('game/js/ui/TooltipContent.js', 'utf8');
        expect(renderer).toContain('die-id-caption');
        expect(renderer).toContain('Die ${die.dieId');
        expect(tooltip).not.toContain('tip-die-id');
        const styles = readFileSync('game/css/styles.css', 'utf8');
        expect(styles).toContain('.die-slot:hover .die-id-caption');
        expect(styles).toContain('grid-template-columns: minmax(0, 1fr) 168px');
        expect(styles).toContain('.die.dice-inspect-face');
        expect(styles).not.toContain('pause-menu-modal.dice-inspect-modal');
        const overlay = readFileSync('game/js/ui/DiceInspectOverlay.js', 'utf8');
        expect(overlay).not.toContain('dice-inspect-modal');
        expect(overlay).toContain('dice-inspect-aside');
    });
});
