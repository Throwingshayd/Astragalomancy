/**
 * Boon Playtest — crafted lore pool only (Wave 0 seats + Fits + near-miss redesigns).
 *
 * Run: npm run playtest:boons
 * URL params: ?test=boon:id1,id2 &enhance=iron
 */

import { test, expect } from '@playwright/test';

const SEED = 'boontest1';
const ROLL_WAIT = 800;
const SCORING_WAIT = 5500;
const VIEWPORT = { width: 1920, height: 1080 };

const CRAFTED_BOONS = [
    'silver_bow_of_artemis', 'girdle_of_aphrodite', 'triple_torch_of_hecate', 'yoke_of_hera',
    'mist_of_ithaca', 'pomegranate_of_persephone', 'anvil_of_hephaestus', 'spoils_of_ares',
    'dionysus_revelry', 'caduceus_of_hermes', 'pythian_course', 'spectrum_of_iris',
    'asphodel_of_hades', 'the_lots_of_zeus', 'veil_of_nyx', 'seven_sisters',
    'trident_of_poseidon', 'nine_muses', 'pandoras_jar',
    'sisyphus_boulder', 'tantalus_curse', 'proteus_disguise',
    'icarus_wings', 'lethe_waters', 'medusas_gaze', 'cerberus_watch', 'trojan_horse',
    'typhon', 'cornucopia_of_ploutos', 'the_odyssey', 'bellows_of_war', 'reflection_of_narcissus',
];

function buildTestUrl(boonIds, options = {}) {
    const ids = Array.isArray(boonIds) ? boonIds.join(',') : boonIds;
    const params = new URLSearchParams();
    params.set('test', `boon:${ids}`);
    if (options.enhance) params.set('enhance', options.enhance);
    return `/?${params.toString()}`;
}

function buildSevenSidedTestUrl() {
    const params = new URLSearchParams();
    params.set('test', 'seven_sided');
    return `/?${params.toString()}`;
}

async function startGame(page, boonIds, options = {}) {
    await page.addInitScript(() => {
        try {
            Object.keys(localStorage).forEach((k) => {
                if (k.startsWith('diceOfDionysus_')) localStorage.removeItem(k);
            });
            localStorage.setItem('diceOfDionysus_tutorialShown', '1');
        } catch (_) {
            /* ignore */
        }
    });
    await page.setViewportSize(VIEWPORT);
    await page.goto(buildTestUrl(boonIds, options));
    await page.getByPlaceholder(/seed/i).fill(options.seed || SEED);
    await page.locator('#playButton').evaluate((el) => el.click());
    await expect(page.locator('#gameContainerWrapper')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(600);
}

async function rollAndScore(page, category) {
    await page.getByRole('button', { name: /cast the bones/i }).click();
    await page.waitForTimeout(ROLL_WAIT);
    await page.locator(`.score-row[data-category="${category}"]`).click();
    const confirmYes = page.locator('#confirmYes');
    if (await confirmYes.isVisible().catch(() => false)) await confirmYes.click();
    await page.waitForTimeout(SCORING_WAIT);
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];

async function expectTurn(page, turn) {
    await expect(page.locator('#turnDisplay')).toHaveText(ROMAN[turn]);
}

test.describe('Boon Playtests', () => {
    test.describe.configure({ timeout: 120000 });

    for (const id of CRAFTED_BOONS) {
        test(`equip ${id}`, async ({ page }) => {
            await startGame(page, id);
            await expect(page.locator(`.boon-slots [data-card-id="${id}"]`)).toBeVisible();
            await rollAndScore(page, 'Chance');
            await expectTurn(page, 2);
        });
    }

    test('combo: Sisyphus + Wax Wings + Elpis', async ({ page }) => {
        await startGame(page, ['sisyphus_boulder', 'icarus_wings', 'pandoras_jar']);
        await expect(page.locator('.boon-slots [data-card-id="sisyphus_boulder"]')).toBeVisible();
        await expect(page.locator('.boon-slots [data-card-id="icarus_wings"]')).toBeVisible();
        await expect(page.locator('.boon-slots [data-card-id="pandoras_jar"]')).toBeVisible();
        await rollAndScore(page, 'Chance');
        await expectTurn(page, 2);
    });

    test('combo: Proteus left of Silver Bow', async ({ page }) => {
        await startGame(page, ['silver_bow_of_artemis', 'proteus_disguise']);
        await expect(page.locator('.boon-slots [data-card-id="proteus_disguise"]')).toBeVisible();
        await rollAndScore(page, 'Ones');
        await expectTurn(page, 2);
    });

    test('combo: Horse of Troy + Odyssey', async ({ page }) => {
        await startGame(page, ['the_odyssey', 'trojan_horse']);
        await expect(page.locator('.boon-slots [data-card-id="the_odyssey"]')).toBeVisible();
        await expect(page.locator('.boon-slots [data-card-id="trojan_horse"]')).toBeVisible();
        await rollAndScore(page, 'Chance');
        await expectTurn(page, 2);
    });

    test('Nine Muses with enhanced dice', async ({ page }) => {
        await startGame(page, 'nine_muses', { enhance: 'iron' });
        await expect(page.locator('.boon-slots [data-card-id="nine_muses"]')).toBeVisible();
        await rollAndScore(page, 'Chance');
        await expectTurn(page, 2);
    });

    test('7-sided dice - roll produces face 7 after bonus Yahtzee unlock', async ({ page }) => {
        await page.addInitScript(() => {
            try {
                Object.keys(localStorage).forEach((k) => {
                    if (k.startsWith('diceOfDionysus_')) localStorage.removeItem(k);
                });
                localStorage.setItem('diceOfDionysus_tutorialShown', '1');
            } catch (_) {
                /* ignore */
            }
        });
        await page.setViewportSize(VIEWPORT);
        await page.goto(buildSevenSidedTestUrl());
        await page.getByPlaceholder(/seed/i).fill('seven_sided_test');
        await page.locator('#playButton').evaluate((el) => el.click());
        await expect(page.locator('#gameContainerWrapper')).toBeVisible({ timeout: 8000 });
        await page.waitForTimeout(600);
        await page.getByRole('button', { name: /cast the bones/i }).click();
        await page.waitForTimeout(ROLL_WAIT);
        const hasSeven = await page.evaluate(() => {
            const dice = window.game?.state?.dice;
            if (!dice) return false;
            return dice.some((d) => (typeof d.getEffectiveFace === 'function' ? d.getEffectiveFace() : d.face) === 7);
        });
        expect(hasSeven).toBe(true);
    });
});
