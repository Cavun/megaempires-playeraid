const { test, expect } = require('@playwright/test');
const {
  openHelper,
  keepOnly,
  rowFor,
  setCensus
} = require('./helpers');

test.describe('Census helper – row highlighting', () => {
  test('entering a census number turns that row green', async ({ page }) => {
    await openHelper(page);

    await expect(rowFor(page, 'Babylon')).not.toHaveClass(/updated/);

    await setCensus(page, 'Babylon', 14);

    await expect(rowFor(page, 'Babylon')).toHaveClass(/updated/);
    // Neighbouring rows are untouched.
    await expect(rowFor(page, 'Celt')).not.toHaveClass(/updated/);
  });

  test('the green row is actually rendered green', async ({ page }) => {
    await openHelper(page);

    const row = rowFor(page, 'Babylon');
    const background = () => row.evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(await background()).toBe('rgba(0, 0, 0, 0)');

    await setCensus(page, 'Babylon', 3);

    // The background is transitioned over .15s, so poll rather than sampling
    // it once. .updated is rgba(58,106,48,.12) – a green tint.
    await expect.poll(background).toMatch(/^rgba?\(58, 106, 48/);
  });

  test('sorting clears the green highlight from every row', async ({ page }) => {
    await openHelper(page);

    await setCensus(page, 'Minoa', 5);
    await setCensus(page, 'Saba', 6);
    await expect(rowFor(page, 'Minoa')).toHaveClass(/updated/);
    await expect(rowFor(page, 'Saba')).toHaveClass(/updated/);

    await page.locator('#sort-census-btn').click();

    await expect(page.locator('#active-tbody tr.updated')).toHaveCount(0);
  });

  test('once every row is green they all reset to normal together', async ({ page }) => {
    await openHelper(page);
    await keepOnly(page, ['Minoa', 'Saba', 'Assyria']);

    await setCensus(page, 'Minoa', 1);
    await setCensus(page, 'Saba', 2);
    await expect(page.locator('#active-tbody tr.updated')).toHaveCount(2);

    // Still two of three – nothing resets while a row is outstanding.
    await page.clock.runFor(2000);
    await expect(page.locator('#active-tbody tr.updated')).toHaveCount(2);

    await setCensus(page, 'Assyria', 3);
    await expect(page.locator('#active-tbody tr.updated')).toHaveCount(3);

    // The reset is on an 800ms delay so the all-green state is visible.
    await page.clock.runFor(900);
    await expect(page.locator('#active-tbody tr.updated')).toHaveCount(0);
  });

  test('the city table highlights independently of the census table', async ({ page }) => {
    await openHelper(page);

    await page.locator('#cities-tbody tr').first().locator('.census-input').fill('4');

    await expect(page.locator('#cities-tbody tr.updated')).toHaveCount(1);
    await expect(page.locator('#active-tbody tr.updated')).toHaveCount(0);
  });
});
