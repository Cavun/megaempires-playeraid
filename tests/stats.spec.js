const { test, expect } = require('@playwright/test');
const { openHelper, keepOnly, setCensus, setCities } = require('./helpers');

const stats = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mega-empires-stats') || 'null'));

test.describe('Stat tracking', () => {
  test.beforeEach(async ({ page }) => {
    await openHelper(page, { clock: false });
    await keepOnly(page, ['Minoa', 'Saba', 'Rome']);
  });

  test('sorting a partly filled census table records nothing', async ({ page }) => {
    await setCensus(page, 'Minoa', 5);
    await setCensus(page, 'Saba', 7);
    await page.locator('#sort-census-btn').click();
    expect(await stats(page)).toBeNull();
  });

  test('a fully filled, sorted census table is saved as turn 1, then turn 2', async ({ page }) => {
    await setCensus(page, 'Minoa', 5);
    await setCensus(page, 'Saba', 7);
    await setCensus(page, 'Rome', 0);
    await page.locator('#sort-census-btn').click();

    let s = await stats(page);
    expect(s.census).toHaveLength(1);
    expect(s.census[0].turn).toBe(1);
    expect(s.census[0].values).toEqual({
      1: { name: 'Minoa', value: 5 }, 2: { name: 'Saba', value: 7 }, 11: { name: 'Rome', value: 0 }
    });
    expect(s.cities).toEqual([]);

    // Sorting again without re-entering everything doesn't add a turn.
    await setCensus(page, 'Minoa', 9);
    await page.locator('#sort-census-btn').click();
    expect((await stats(page)).census).toHaveLength(1);

    await setCensus(page, 'Saba', 12);
    await setCensus(page, 'Rome', 3);
    await page.locator('#sort-census-btn').click();
    s = await stats(page);
    expect(s.census).toHaveLength(2);
    expect(s.census[1].turn).toBe(2);
    expect(s.census[1].values[1].value).toBe(9);
  });

  test('city counts are recorded on their own turn counter', async ({ page }) => {
    for (const [civ, n] of [['Minoa', 1], ['Saba', 2], ['Rome', 3]]) await setCities(page, civ, n);
    await page.locator('#sort-cities-btn').click();

    const s = await stats(page);
    expect(s.census).toEqual([]);
    expect(s.cities).toHaveLength(1);
    expect(s.cities[0].values[11]).toEqual({ name: 'Rome', value: 3 });
    await expect(page.locator('#report-status')).toContainText('census 0 turns, cities 1 turn');
  });

  test('the report draws a census and a cities line for the chosen civ', async ({ page }) => {
    for (const turn of [[5, 1], [10, 2], [20, 4]]) {
      for (const civ of ['Minoa', 'Saba', 'Rome']) {
        await setCensus(page, civ, turn[0]);
        await setCities(page, civ, turn[1]);
      }
      await page.locator('#sort-census-btn').click();
      await page.locator('#sort-cities-btn').click();
    }

    await page.locator('#report-btn').click();
    await expect(page.locator('#report')).toBeVisible();
    await expect(page.locator('#report-civ option')).toHaveText(['Minoa', 'Saba', 'Rome']);

    await page.locator('#report-civ').selectOption({ label: 'Rome' });
    await expect(page.locator('#report-chart .point-census')).toHaveCount(3);
    await expect(page.locator('#report-chart .point-cities')).toHaveCount(3);
    await expect(page.locator('#report-chart')).toHaveAttribute('aria-label', /Rome/);
  });

  test('Clear Stats wipes the saved turns', async ({ page }) => {
    for (const civ of ['Minoa', 'Saba', 'Rome']) await setCensus(page, civ, 4);
    await page.locator('#sort-census-btn').click();
    expect((await stats(page)).census).toHaveLength(1);

    page.once('dialog', (d) => d.accept());
    await page.locator('#clear-stats-btn').click();
    expect(await stats(page)).toBeNull();
    await expect(page.locator('#report-status')).toContainText('census 0 turns');
  });
});
