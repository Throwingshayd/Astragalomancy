// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Buying a Worship card by dragging it from the shelf onto its god's tablet.
 * The unit tests cover the rules; this covers the wiring — pointer events,
 * hit-testing the frieze while the shop art is on top, and the card never
 * landing in a consumable slot.
 */

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

test('a Worship ware dragged onto its tablet is bought and offered', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await startPlay(page, 'test=winning');
    await page.evaluate(() => {
        window.game.state.gold = 40;
        window.game.openShop();
    });
    await page.waitForSelector('#shopStage:not(.hidden)', { timeout: 12000 });
    await page.waitForTimeout(500);

    // Aphrodite answers to Twos; inject the ware so the shelf roll cannot flake the test.
    await page.evaluate(() => {
        const data = CardData.worship.find((w) => w.god === 'Aphrodite');
        const el = window.uiManager.shopUI.createCardElement(
            data, 'direct', window.game.state, window.game,
        );
        el.dataset.cardId = data.id;
        el.id = 'testWorshipWare';
        document.getElementById('shopDirectSales').appendChild(el);
    });

    const from = await page.locator('#testWorshipWare').boundingBox();
    const to = await page.locator('#scorecard .pantheon-chip[data-category="Twos"]').boundingBox();

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 40, from.y + from.height / 2 + 40, { steps: 6 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await page.waitForTimeout(150);

    // Only Aphrodite's tablet may light up for an unascended card.
    const lit = await page.evaluate(() => [...document.querySelectorAll('.pantheon-worship-target')]
        .map((c) => c.getAttribute('data-category')));
    expect(lit).toEqual(['Twos']);
    await expect(page.locator('.pantheon-worship-drag-hot')).toHaveCount(1);

    await page.mouse.up();
    await page.waitForTimeout(400);

    const after = await page.evaluate(() => ({
        gold: window.game.state.gold,
        consumables: window.game.state.consumables.length,
        aphrodite: window.game.state.worshipLevels.Aphrodite,
        onShelf: !!document.getElementById('testWorshipWare'),
        stillLit: document.querySelectorAll('.pantheon-worship-target').length,
    }));

    expect(after.aphrodite).toBe(1);
    expect(after.gold).toBeLessThan(40);
    expect(after.consumables).toBe(0);
    expect(after.onShelf).toBe(false);
    expect(after.stillLit).toBe(0);
    expect(errors).toEqual([]);
});

test('packs are bigger than single wares on the shelf', async ({ page }) => {
    await startPlay(page, 'test=winning');
    await page.evaluate(() => window.game.openShop());
    await page.waitForSelector('#shopStage:not(.hidden)', { timeout: 12000 });
    await page.waitForTimeout(500);

    const pack = await page.locator('#shopPacksArea .pack-card').first().boundingBox();
    const ware = await page.locator('#shopDirectSales .card').first().boundingBox();
    expect(pack.width).toBeGreaterThan(ware.width * 1.2);
    expect(pack.height).toBeGreaterThan(ware.height * 1.2);
});
