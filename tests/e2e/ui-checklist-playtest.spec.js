/**
 * UI checklist Steps 4–5 — artifact shop drag + Anthology tabs/paging/tooltips.
 * Run: npx playwright test tests/e2e/ui-checklist-playtest.spec.js
 */

import { test, expect } from '@playwright/test';

const VIEWPORT = { width: 1280, height: 900 };

async function clearSaves(page) {
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
}

async function startRun(page, seed = 'uicheck1') {
    await page.setViewportSize(VIEWPORT);
    await page.goto('/');
    await page.getByPlaceholder(/seed/i).fill(seed);
    await page.locator('#playButton').evaluate((el) => el.click());
    await expect(page.locator('#gameContainerWrapper')).toBeVisible({ timeout: 12000 });
    await page.waitForFunction(() => !!window.game?.state, null, { timeout: 12000 });
}

async function pointerDrag(page, fromX, fromY, toX, toY) {
    await page.mouse.move(fromX, fromY);
    await page.mouse.down();
    await page.mouse.move(fromX + 20, fromY + 20);
    await page.mouse.move(toX, toY, { steps: 12 });
    await page.mouse.up();
}

test.describe('UI checklist step 5 — Anthology', () => {
    test.beforeEach(async ({ page }) => {
        await clearSaves(page);
        await page.setViewportSize(VIEWPORT);
        await page.goto('/');
    });

    test('four tabs, paging, hover tooltip, and click-pin', async ({ page }) => {
        await page.locator('#collectionButton').click();
        await expect(page.locator('#collectionScreen')).toBeVisible();

        await page.waitForFunction(() => window.balatroEffects?.isInitialized === true, null, { timeout: 8000 });

        const tabs = ['boons', 'artifacts', 'worship', 'libations'];
        for (const tab of tabs) {
            await page.locator(`.collection-tabs button[data-tab="${tab}"]`).click();
            const grid = page.locator(`#${tab}CollectionGrid`);
            await expect(grid).toBeVisible();
            await expect(grid.locator('.card[data-card-surface="rack"]').first()).toBeVisible({ timeout: 8000 });
        }

        await page.locator('.collection-tabs button[data-tab="boons"]').click();
        const { totalBoons, maxPage } = await page.evaluate(() => {
            const cm = window.app.collectionManager;
            const n = cm.tabCards.boons.length;
            const pages = Math.max(1, Math.ceil(n / cm.pageSize));
            return { totalBoons: n, maxPage: pages };
        });
        expect(totalBoons).toBeGreaterThan(9);
        expect(maxPage).toBeGreaterThan(1);

        const indicator = page.locator('#collectionPageIndicator');
        await expect(indicator).toHaveText(`Page 1 / ${maxPage}`);
        await page.locator('#collectionNextPageBtn').click();
        await expect(indicator).toHaveText(`Page 2 / ${maxPage}`);
        await page.locator('#collectionPrevPageBtn').click();
        await expect(indicator).toHaveText(`Page 1 / ${maxPage}`);

        const card = page.locator('#boonsCollectionGrid .card[data-tooltip]').first();
        const box = await card.boundingBox();
        expect(box).toBeTruthy();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(200);
        const hoverTip = page.locator('#tooltip-root .tooltip-card');
        await expect(hoverTip).toBeVisible({ timeout: 3000 });

        await card.click();
        await expect(page.locator('#tooltip-root .tooltip-card.pinned')).toBeVisible({ timeout: 3000 });
    });
});

test.describe('UI checklist step 4 — shop artifact drag', () => {
    test('drag shop artifact into the artifacts chest purchases it', async ({ page }) => {
        await clearSaves(page);
        await startRun(page);

        const opened = await page.evaluate(() => {
            const game = window.game;
            if (!game?.state) return false;
            game.state.gold = 500;
            window.shopManager.openShop(game.state, game);
            return true;
        });
        expect(opened).toBe(true);

        const artifact = page.locator('#shopArtifactsArea .shop-draggable-artifact').first();
        await expect(artifact).toBeVisible({ timeout: 8000 });

        const beforeCount = await page.evaluate(() => window.game.state.artifacts.length);
        const artBox = await artifact.boundingBox();
        const chest = page.locator('#artifactsChest');
        const chestBox = await chest.boundingBox();
        expect(artBox && chestBox).toBeTruthy();

        await pointerDrag(
            page,
            artBox.x + artBox.width / 2,
            artBox.y + artBox.height / 2,
            chestBox.x + chestBox.width / 2,
            chestBox.y + chestBox.height / 2
        );

        await expect.poll(async () =>
            page.evaluate(() => window.game.state.artifacts.length)
        ).toBe(beforeCount + 1);
        await expect(artifact).toHaveCount(0);
        // The lid only opens for a live drag, so it must be shut again afterwards.
        await expect(chest).not.toHaveClass(/is-open/);
    });

    test('artifacts anthology tab lists rack-surface artifact cards', async ({ page }) => {
        await clearSaves(page);
        await page.setViewportSize(VIEWPORT);
        await page.goto('/');
        await page.locator('#collectionButton').click();
        await page.locator('.collection-tabs button[data-tab="artifacts"]').click();
        const grid = page.locator('#artifactsCollectionGrid');
        await expect(grid).toBeVisible();
        await expect(grid.locator('.card.artifact-card[data-card-surface="rack"]').first()).toBeVisible({
            timeout: 8000,
        });
    });
});
