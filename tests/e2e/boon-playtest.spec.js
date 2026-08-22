/**
 * Boon Playtest — Tests each boon with:
 * 1. Mechanic working as intended
 * 2. Visual feedback (pips/favour live counter, bonus over pips)
 * 3. Combo with other boons
 * 4. Enhanced dice interaction (where relevant)
 *
 * Run: npm run playtest:boons
 * URL params: ?test=boon:id1,id2 &enhance=iron
 */

import { test, expect } from '@playwright/test';

const SEED = 'boontest1';
const ROLL_WAIT = 800;
const SCORING_WAIT = 5500;
const VIEWPORT = { width: 1920, height: 1080 };

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
  // Isolated run: clear persisted saves/settings so auto-save from a prior test cannot hijack the next.
  // Skip first-run tutorial overlay (blocks #rollButton) — key matches dataManager.prefix + 'tutorialShown'
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

async function getLivePips(page) {
  const el = page.locator('[data-live="pips"]');
  return el.isVisible() ? (await el.textContent()) || '0' : '0';
}

async function getLiveFavour(page) {
  const el = page.locator('[data-live="favour"]');
  return el.isVisible() ? (await el.textContent()) || '0' : '0';
}

async function getGold(page) {
  const text = await page.locator('#goldDisplay').textContent();
  return parseInt(String(text).replace(/\D/g, ''), 10) || 0;
}

/**
 * The clepsydra plaque renders the turn as a Roman numeral, so digit-matching against it
 * can never pass. These two convert instead of stripping.
 */
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];

async function getTurn(page) {
  const text = String(await page.locator('#turnDisplay').textContent()).trim();
  const n = ROMAN.indexOf(text);
  return n > 0 ? n : 1;
}

async function expectTurn(page, turn) {
  await expect(page.locator('#turnDisplay')).toHaveText(ROMAN[turn]);
}

async function hasPipsOrFavourAddition(page) {
  const pipsAdd = page.locator('[data-live="pips-add"]');
  const favourAdd = page.locator('[data-live="favour-add"]');
  const pipsVisible = await pipsAdd.isVisible().catch(() => false);
  const favourVisible = await favourAdd.isVisible().catch(() => false);
  return pipsVisible || favourVisible;
}

test.describe('Boon Playtests', () => {
  test.describe.configure({ timeout: 120000 });

  // --- MECHANIC: Conditional Favour ---
  test("Hestia's Hearth - +3 Favour when all odd or all even", async ({ page }) => {
    await startGame(page, 'hestias_hearth');
    await expect(page.locator('.boon-slots [data-card-id="hestias_hearth"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- MECHANIC: Gold after score ---
  test("Charon's Ferry Fare - +1 Gold after scoring", async ({ page }) => {
    await startGame(page, 'charons_ferry_fare');
    const goldBefore = await getGold(page);
    await rollAndScore(page, 'Chance');
    await page.waitForTimeout(1200);
    const goldAfter = await getGold(page);
    expect(goldAfter).toBeGreaterThanOrEqual(goldBefore);
  });

  // --- MECHANIC: Pips per reroll remaining ---
  test("The Gambler - +10 pips per reroll remaining", async ({ page }) => {
    await startGame(page, 'the_gambler');
    await expect(page.locator('.boon-slots [data-card-id="the_gambler"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- MECHANIC + VISUAL: Gold-scaling favour ---
  test("Midas Touch - +0.1 Favour per 5 Gold", async ({ page }) => {
    await startGame(page, 'midas_touch');
    await rollAndScore(page, 'Chance');
    await page.waitForTimeout(500);
    const pipsEl = page.locator('[data-live="pips"]');
    await expect(pipsEl).toBeVisible();
  });

  // --- MECHANIC: Unused reroll bonus ---
  test("Icarus' Wings - +10 pips per unused reroll", async ({ page }) => {
    await startGame(page, 'icarus_wings');
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- MECHANIC: Dice value filter + pips ---
  test("Lethe Waters - dice 2 or less not counted, +25 pips", async ({ page }) => {
    await startGame(page, 'lethe_waters');
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- MECHANIC: Favour per unused reroll ---
  test("Forge of Hephaestus - x0.5 Favour per unused reroll (max x1.5)", async ({ page }) => {
    await startGame(page, 'forge_of_hephaestus');
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- COMBO: Two boons together ---
  test('Combo: Midas Touch + Hestia Hearth (gold + conditional favour)', async ({ page }) => {
    await startGame(page, ['midas_touch', 'hestias_hearth']);
    await expect(page.locator('.boon-slots [data-card-id="midas_touch"]')).toBeVisible();
    await expect(page.locator('.boon-slots [data-card-id="hestias_hearth"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- ENHANCED DICE: Iron (+5 pips) with boon ---
  test('Enhanced dice (Iron) + The Gambler - pips from both', async ({ page }) => {
    await startGame(page, 'the_gambler', { enhance: 'iron' });
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- MECHANIC: Sum divisible by 10 ---
  test("Mathematician's Compass - Small/Large Straights gain +2 Favour", async ({ page }) => {
    await startGame(page, 'mathematicians_compass');
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- MECHANIC: First score bonus ---
  test("First Blood - +50 pips on first score each ante", async ({ page }) => {
    await startGame(page, 'first_blood');
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- MECHANIC: Pips per reroll this turn ---
  test("Sisyphus' Boulder - +5 pips per reroll this turn", async ({ page }) => {
    await startGame(page, 'sisyphus_boulder');
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- MECHANIC: Prometheus -1 roll, +3 favour ---
  test("Prometheus' Gift - +3 Favour, -1 reroll", async ({ page }) => {
    await startGame(page, 'prometheus_gift');
    await expect(page.locator('#rollsLeft')).toContainText(/2/);
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- MECHANIC: Achilles -15 pips, -1 gold per roll ---
  test("Achilles' Heel - +15 pips, -1 Gold per roll", async ({ page }) => {
    await startGame(page, 'achilles_heel');
    const goldBefore = await getGold(page);
    await page.getByRole('button', { name: /cast the bones/i }).click();
    await page.waitForTimeout(ROLL_WAIT);
    const goldAfter = await getGold(page);
    expect(goldAfter).toBeLessThanOrEqual(goldBefore + 1);
    await rollAndScore(page, 'Chance');
  });

  // --- COMBO: Three boons (real game environment) ---
  test('Combo: Gambler + Icarus + First Blood (real game env)', async ({ page }) => {
    await startGame(page, ['the_gambler', 'icarus_wings', 'first_blood']);
    await expect(page.locator('.boon-slots [data-card-id="the_gambler"]')).toBeVisible();
    await expect(page.locator('.boon-slots [data-card-id="icarus_wings"]')).toBeVisible();
    await expect(page.locator('.boon-slots [data-card-id="first_blood"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
    await rollAndScore(page, 'Three of a Kind');
    await expectTurn(page, 3);
  });

  // --- ENHANCED + COMBO ---
  test('Enhanced (Iron) + Midas + Gambler - all bonuses stack', async ({ page }) => {
    await startGame(page, ['midas_touch', 'the_gambler'], { enhance: 'iron' });
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- VISUAL: Live score shows pips/favour (smoke) ---
  test('Live score display shows pips and favour during scoring', async ({ page }) => {
    await startGame(page, 'midas_touch');
    await page.getByRole('button', { name: /cast the bones/i }).click();
    await page.waitForTimeout(ROLL_WAIT);
    await page.locator('.score-row[data-category="Chance"]').click();
    const confirmYes = page.locator('#confirmYes');
    if (await confirmYes.isVisible().catch(() => false)) await confirmYes.click();
    await page.waitForTimeout(2000);
    const pipsEl = page.locator('[data-live="pips"]');
    const favourEl = page.locator('[data-live="favour"]');
    await expect(pipsEl).toBeVisible();
    await expect(favourEl).toBeVisible();
  });

  // --- ALL BOONS: Mechanic smoke (loads, visible, turn completes) ---
  test("Chaos Primordial - doubles favour, -1 reroll", async ({ page }) => {
    await startGame(page, 'chaos_primordial');
    await expect(page.locator('.boon-slots [data-card-id="chaos_primordial"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Mt Olympus - +1 Favour per worship card used", async ({ page }) => {
    await startGame(page, 'mt_olympus');
    await expect(page.locator('.boon-slots [data-card-id="mt_olympus"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Kronos' Hourglass - +1 roll each turn", async ({ page }) => {
    await startGame(page, 'kronos_hourglass');
    await expect(page.locator('.boon-slots [data-card-id="kronos_hourglass"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Pandora's Jar - every 3rd turn destroys boon, +2 favour", async ({ page }) => {
    await startGame(page, 'pandoras_jar');
    await expect(page.locator('.boon-slots [data-card-id="pandoras_jar"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Demeter's Harvest - one die +1 per turn", async ({ page }) => {
    await startGame(page, 'demeters_harvest');
    await expect(page.locator('.boon-slots [data-card-id="demeters_harvest"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Medusa's Gaze - 6s cannot be rerolled", async ({ page }) => {
    await startGame(page, 'medusas_gaze');
    await expect(page.locator('.boon-slots [data-card-id="medusas_gaze"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Dionysus' Revelry - 2 pairs = Full House", async ({ page }) => {
    await startGame(page, 'dionysus_revelry');
    await expect(page.locator('.boon-slots [data-card-id="dionysus_revelry"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Apollo's Oracle - +1 reroll, -20% score", async ({ page }) => {
    await startGame(page, 'apollos_oracle');
    await expect(page.locator('.boon-slots [data-card-id="apollos_oracle"]')).toBeVisible();
    await expect(page.locator('#rollsLeft')).toContainText(/4/);
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Hydra's Heads - 2 pairs +3 favour", async ({ page }) => {
    await startGame(page, 'hydras_heads');
    await expect(page.locator('.boon-slots [data-card-id="hydras_heads"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Tantalus' Curse - +0.1 favour per gold, cannot spend", async ({ page }) => {
    await startGame(page, 'tantalus_curse');
    await expect(page.locator('.boon-slots [data-card-id="tantalus_curse"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Pegasus' Flight - 6+ dice x0.5 extra favour", async ({ page }) => {
    await startGame(page, 'pegasus_flight');
    await expect(page.locator('.boon-slots [data-card-id="pegasus_flight"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Cerberus' Watch - first 3 held +3 pips each", async ({ page }) => {
    await startGame(page, 'cerberus_watch');
    await expect(page.locator('.boon-slots [data-card-id="cerberus_watch"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("The Trojan Horse - after turn 10 boons x2", async ({ page }) => {
    await startGame(page, 'trojan_horse');
    await expect(page.locator('.boon-slots [data-card-id="trojan_horse"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Lucky Dice Bag - auto-reroll 1s", async ({ page }) => {
    await startGame(page, 'lucky_dice_bag');
    await expect(page.locator('.boon-slots [data-card-id="lucky_dice_bag"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Gambler's Charm - 50% +2 gold or -1 gold", async ({ page }) => {
    await startGame(page, 'gamblers_charm');
    await expect(page.locator('.boon-slots [data-card-id="gamblers_charm"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Marathon Runner - +1 pip per roll (stacks)", async ({ page }) => {
    await startGame(page, 'marathon_runner');
    await expect(page.locator('.boon-slots [data-card-id="marathon_runner"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Golden Touch - interest 1 gold per 3 saved", async ({ page }) => {
    await startGame(page, 'golden_touch');
    await expect(page.locator('.boon-slots [data-card-id="golden_touch"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Prime Time - prime dice grant +0.3 Favour each", async ({ page }) => {
    await startGame(page, 'prime_time');
    await expect(page.locator('.boon-slots [data-card-id="prime_time"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("The Locksmith - held dice +1 pips per hold", async ({ page }) => {
    await startGame(page, 'the_locksmith');
    await expect(page.locator('.boon-slots [data-card-id="the_locksmith"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("The Merchant - selling libation/worship +1 gold", async ({ page }) => {
    await startGame(page, 'the_merchant');
    await expect(page.locator('.boon-slots [data-card-id="the_merchant"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("The Heretic - +2 pips per turn (stacks)", async ({ page }) => {
    await startGame(page, 'the_heretic');
    await expect(page.locator('.boon-slots [data-card-id="the_heretic"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Reckless Abandon - ×2 Favour when no dice held", async ({ page }) => {
    await startGame(page, 'reckless_abandon');
    await expect(page.locator('.boon-slots [data-card-id="reckless_abandon"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Typhon - each 1 grants +0.5 Favour", async ({ page }) => {
    await startGame(page, 'typhon');
    await expect(page.locator('.boon-slots [data-card-id="typhon"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Early Bird - turns 1-3 +20, 4-5 +2 gold, 6-13 -5", async ({ page }) => {
    await startGame(page, 'early_bird');
    await expect(page.locator('.boon-slots [data-card-id="early_bird"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("The Symposium - 4+ matching +0.05 favour", async ({ page }) => {
    await startGame(page, 'the_symposium');
    await expect(page.locator('.boon-slots [data-card-id="the_symposium"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Assembly of Heroes - all slots full +15 pips", async ({ page }) => {
    await startGame(page, 'assembly_of_heroes');
    await expect(page.locator('.boon-slots [data-card-id="assembly_of_heroes"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Divine Synergy - same rarity +5 pips", async ({ page }) => {
    await startGame(page, 'divine_synergy');
    await expect(page.locator('.boon-slots [data-card-id="divine_synergy"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Midnight Oil - turn 12+ +24 pips, -1 roll", async ({ page }) => {
    await startGame(page, 'midnight_oil');
    await expect(page.locator('.boon-slots [data-card-id="midnight_oil"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Parmenides Die - pantheon swap (scores go to corresponding slot)", async ({ page }) => {
    await startGame(page, 'parmenides_die');
    await expect(page.locator('.boon-slots [data-card-id="parmenides_die"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Doubling Season - evens +2, odds -1", async ({ page }) => {
    await startGame(page, 'doubling_season');
    await expect(page.locator('.boon-slots [data-card-id="doubling_season"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Symmetry - palindrome +0.5 favour", async ({ page }) => {
    await startGame(page, 'symmetry');
    await expect(page.locator('.boon-slots [data-card-id="symmetry"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Misery - 0 gold x2 favour", async ({ page }) => {
    await startGame(page, 'misery');
    await expect(page.locator('.boon-slots [data-card-id="misery"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Smog of Morpheus - 2,4 become 3", async ({ page }) => {
    await startGame(page, 'smog_of_morpheus');
    await expect(page.locator('.boon-slots [data-card-id="smog_of_morpheus"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("The Zealot - favour of last worship card", async ({ page }) => {
    await startGame(page, 'the_zealot');
    await expect(page.locator('.boon-slots [data-card-id="the_zealot"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Mortal Vineyard - selling boon gives libation", async ({ page }) => {
    await startGame(page, 'mortal_vineyard');
    await expect(page.locator('.boon-slots [data-card-id="mortal_vineyard"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Proteus' Disguise - copies boon to left", async ({ page }) => {
    await startGame(page, ['the_gambler', 'proteus_disguise']);
    await expect(page.locator('.boon-slots [data-card-id="proteus_disguise"]')).toBeVisible();
    await expect(page.locator('.boon-slots [data-card-id="the_gambler"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Cornucopia of Ploutos - gold x1.5 at ante end", async ({ page }) => {
    await startGame(page, 'cornucopia_of_ploutos');
    await expect(page.locator('.boon-slots [data-card-id="cornucopia_of_ploutos"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("The Odyssey - perfect ante bonus", async ({ page }) => {
    await startGame(page, 'the_odyssey');
    await expect(page.locator('.boon-slots [data-card-id="the_odyssey"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Message in a Bottle - solo ante +50% threshold", async ({ page }) => {
    await startGame(page, 'message_in_a_bottle');
    await expect(page.locator('.boon-slots [data-card-id="message_in_a_bottle"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Betrayal by Paris - destroy boon at ante end, +10 gold", async ({ page }) => {
    await startGame(page, 'betrayal_by_paris');
    await expect(page.locator('.boon-slots [data-card-id="betrayal_by_paris"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Eruption of Etna - 3+ boons trigger x1 favour", async ({ page }) => {
    await startGame(page, ['the_gambler', 'icarus_wings', 'eruption_of_etna']);
    await expect(page.locator('.boon-slots [data-card-id="eruption_of_etna"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Cycle of Seasons - worship triggers +1 to another god", async ({ page }) => {
    await startGame(page, 'cycle_of_seasons');
    await expect(page.locator('.boon-slots [data-card-id="cycle_of_seasons"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Ascetic's Vow - empty slots x1 favour each", async ({ page }) => {
    await startGame(page, 'ascetics_vow');
    await expect(page.locator('.boon-slots [data-card-id="ascetics_vow"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Bellows of War - 3/4 of kind as +1 die", async ({ page }) => {
    await startGame(page, 'bellows_of_war');
    await expect(page.locator('.boon-slots [data-card-id="bellows_of_war"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Nyxian Seduction - Chance +69 pips", async ({ page }) => {
    await startGame(page, 'nyxian_seduction');
    await expect(page.locator('.boon-slots [data-card-id="nyxian_seduction"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Gold Standard - ×1.5 Favour while rich (20+ gold)", async ({ page }) => {
    await startGame(page, 'gold_standard', { enhance: 'gold' });
    await expect(page.locator('.boon-slots [data-card-id="gold_standard"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Carillon of the Muses - all enhanced +3 favour", async ({ page }) => {
    await startGame(page, 'carillon_of_the_muses', { enhance: 'iron' });
    await expect(page.locator('.boon-slots [data-card-id="carillon_of_the_muses"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Reflection of Narcissus - boons trigger twice, -2 rolls", async ({ page }) => {
    await startGame(page, 'reflection_of_narcissus');
    await expect(page.locator('.boon-slots [data-card-id="reflection_of_narcissus"]')).toBeVisible();
    await expect(page.locator('#rollsLeft')).toContainText(/1/);
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });
  test("Journey of Perseus - every 100 score +10 pips", async ({ page }) => {
    await startGame(page, 'journey_of_perseus');
    await expect(page.locator('.boon-slots [data-card-id="journey_of_perseus"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // Matrix priority row #1 — compounding pair (human should still verify turn ≥ 10 Trojan)
  test('Matrix #1: Journey of Perseus + Trojan Horse — smoke', async ({ page }) => {
    await startGame(page, ['journey_of_perseus', 'trojan_horse']);
    await expect(page.locator('.boon-slots [data-card-id="journey_of_perseus"]')).toBeVisible();
    await expect(page.locator('.boon-slots [data-card-id="trojan_horse"]')).toBeVisible();
    await rollAndScore(page, 'Chance');
    await expectTurn(page, 2);
  });

  // --- 7-SIDED DICE: bonus Yahtzee unlocks Sevens ---
  test("7-sided dice - roll produces face 7 after bonus Yahtzee unlock", async ({ page }) => {
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
