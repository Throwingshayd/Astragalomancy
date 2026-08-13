// @ts-check
import { test, expect } from '@playwright/test';

const VIEWPORT = { width: 1920, height: 1080 };

async function startPlay(page, query) {
    await page.addInitScript(() => {
        try {
            Object.keys(localStorage).forEach((k) => {
                if (k.startsWith('diceOfDionysus_')) localStorage.removeItem(k);
            });
            localStorage.setItem('diceOfDionysus_tutorialShown', '1');
        } catch (_) { /* ignore */ }
    });
    await page.setViewportSize(VIEWPORT);
    await page.goto(`/${query.startsWith('?') ? query : `?${query}`}`);
    await page.locator('#playButton').click();
    await expect(page.locator('#gameContainerWrapper')).toBeVisible({ timeout: 12000 });
    await page.waitForSelector('.main-game', { timeout: 12000 });
}

/**
 * Rail cards overlap, so hovering must both slide the card up and put it on top:
 * the covered strip is where a boon's live chips and a consumable's name sit.
 */
async function expectHoverLift(page, railSelector, index) {
    const card = page.locator(`${railSelector} .card`).nth(index);
    const resting = await card.boundingBox();
    await card.hover();
    await page.waitForTimeout(250);
    const lifted = await card.boundingBox();
    expect(resting.y - lifted.y).toBeGreaterThan(10);

    const ownsItsBottomEdge = await page.evaluate(({ rail, i }) => {
        const el = document.querySelectorAll(`${rail} .card`)[i];
        const rect = el.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 6);
        return hit?.closest('.card') === el;
    }, { rail: railSelector, i: index });
    expect(ownsItsBottomEdge).toBe(true);
}

test.describe('Greek layout visual checks', () => {
    test('pantheon orthogonal rows and highfaces growth', async ({ page }) => {
        await startPlay(page, 'test=highfaces');

        await expect(page.locator('.pantheon-tier-upper .pantheon-chip:visible')).toHaveCount(8);
        await expect(page.locator('.pantheon-tier-lower .pantheon-chip:visible')).toHaveCount(9);

        const rowFlatness = await page.evaluate(() => {
            const rowSpread = (selector) => {
                const tops = [...document.querySelectorAll(selector)].map(
                    (el) => el.getBoundingClientRect().top
                );
                if (tops.length < 2) return 0;
                return Math.max(...tops) - Math.min(...tops);
            };
            return {
                upper: rowSpread('.pantheon-tier-upper .pantheon-chip'),
                lower: rowSpread('.pantheon-tier-lower .pantheon-chip'),
            };
        });
        expect(rowFlatness.upper).toBeLessThan(14);
        expect(rowFlatness.lower).toBeLessThan(14);

        await expect(page.locator('.consumable-drag-hint')).toHaveCount(0);

        await page.screenshot({
            path: '/opt/cursor/artifacts/greek_layout_highfaces.png',
            fullPage: false,
        });
    });

    test('boon pillar keeps a full stack on stage and lifts the hovered card clear', async ({ page }) => {
        await startPlay(page, 'test=winning');

        const fill = async (count) => {
            await page.evaluate((n) => {
                const ids = ['the_gambler', 'midas_touch', 'sisyphus_boulder', 'typhon',
                    'symmetry', 'the_merchant', 'early_bird'];
                window.game.state.boonSlots = n;
                window.game.state.boons = ids.slice(0, n)
                    .map((id) => new Boon(CardData.boons.find((b) => b.id === id)));
                window.uiManager.updateAll(window.game.state, window.game);
            }, count);
            await expect(page.locator('#boonSlots .card')).toHaveCount(count);
            await page.waitForTimeout(250);
        };

        for (const count of [5, 6, 7]) {
            await fill(count);
            const bounds = await page.evaluate(() => {
                const cards = [...document.querySelectorAll('#boonSlots .card')];
                return {
                    top: Math.min(...cards.map((el) => el.getBoundingClientRect().top)),
                    bottom: Math.max(...cards.map((el) => el.getBoundingClientRect().bottom)),
                };
            });
            expect(bounds.top, `${count} boons: top card is on stage`).toBeGreaterThanOrEqual(0);
            expect(bounds.bottom, `${count} boons: last card is on stage`).toBeLessThanOrEqual(VIEWPORT.height);
        }

        await expectHoverLift(page, '#boonSlots', 2);
    });

    test('blessings and libations fill their own rails and lift on hover', async ({ page }) => {
        await startPlay(page, 'test=winning');

        await page.evaluate(() => {
            window.game.state.consumables = [
                new LibationCard(CardData.libations[0]),
                new WorshipCard(CardData.worship[0]),
                new LibationCard(CardData.libations[1]),
                new WorshipCard(CardData.worship[1]),
                new LibationCard(CardData.libations[2]),
            ];
            window.uiManager.updateAll(window.game.state, window.game);
        });
        await expect(page.locator('#worshipSlots .card')).toHaveCount(2);
        await expect(page.locator('#libationSlots .card')).toHaveCount(3);
        await page.waitForTimeout(250);

        // The libation rail sits in the lower-left gutter, clear of the hourglass.
        const gap = await page.evaluate(() => {
            const rail = document.querySelector('#libationRail').getBoundingClientRect();
            const glass = document.querySelector('#clepsydra').getBoundingClientRect();
            return { railRight: rail.right, glassLeft: glass.left, railTop: rail.top };
        });
        expect(gap.railRight).toBeLessThanOrEqual(gap.glassLeft);
        expect(gap.railTop).toBeGreaterThan(400);

        await expectHoverLift(page, '#worshipSlots', 1);
        await expectHoverLift(page, '#libationSlots', 1);
    });

    // divine_guidance is drunk, not applied to a die — die enhancers deliberately
    // keep the drink oval hidden and route to the dice instead.
    test('libation drag reveals zone with type class', async ({ page }) => {
        await startPlay(page, 'test=libation:divine_guidance');
        await expect(page.locator('#libationSlots .card')).toHaveCount(1, { timeout: 12000 });

        const card = page.locator('#libationSlots .card').first();
        const box = await card.boundingBox();
        expect(box).toBeTruthy();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        // Dragging inside the rail reorders, so aim at the felt to get drop mode.
        const felt = await page.locator('.dice-roll-zone').boundingBox();
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(felt.x + felt.width / 2, cy - 120, { steps: 10 });
        await page.waitForTimeout(200);

        const main = page.locator('.main-game');
        await expect(main).toHaveClass(/consumable-drag-active/);
        await expect(main).toHaveClass(/drag-type-libation-drink/);
        await expect(page.locator('.consumable-zone-libation')).toHaveCSS('opacity', '1');

        await page.mouse.up();
        await page.screenshot({
            path: '/opt/cursor/artifacts/greek_libation_drag.png',
            fullPage: false,
        });
    });
});
