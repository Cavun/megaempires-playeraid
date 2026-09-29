const { test, expect } = require('@playwright/test');
const {
  openHelper,
  activeCivNames,
  rowFor,
  removeCiv,
  setCensus
} = require('./helpers');

test.describe('Census helper – removing civilizations', () => {
  test('a removed civ leaves the census table and moves to "not in game"', async ({ page }) => {
    await openHelper(page);

    await expect(page.locator('#active-tbody tr')).toHaveCount(18);
    await expect(page.locator('#removed-section')).not.toBeVisible();

    await removeCiv(page, 'Rome');

    await expect(page.locator('#active-tbody tr')).toHaveCount(17);
    expect(await activeCivNames(page)).not.toContain('Rome');

    await expect(page.locator('#removed-section')).toBeVisible();
    await expect(page.locator('#removed-tbody tr')).toHaveCount(1);
    await expect(page.locator('#removed-tbody .civ-name')).toHaveText('Rome');
  });

  test('a removed civ also leaves the city table', async ({ page }) => {
    await openHelper(page);

    await removeCiv(page, 'Hatti');

    await expect(page.locator('#cities-tbody tr')).toHaveCount(17);
    expect(await page.locator('#cities-tbody .civ-name').allTextContents()).not.toContain('Hatti');
  });

  test('a removed civ is ignored by the sort button', async ({ page }) => {
    await openHelper(page);

    // Minoa would sort first on census alone; removing it must take it out of
    // the sort entirely rather than leaving it parked at the top.
    await setCensus(page, 'Minoa', 30);
    await setCensus(page, 'Saba', 20);
    await setCensus(page, 'Assyria', 10);

    await removeCiv(page, 'Minoa');
    await page.locator('#sort-census-btn').click();

    const names = await activeCivNames(page);
    expect(names).not.toContain('Minoa');
    expect(names.slice(0, 2)).toEqual(['Saba', 'Assyria']);
    expect(names).toHaveLength(17);
  });

  test('removals persist across a page refresh', async ({ page }) => {
    await openHelper(page);

    await removeCiv(page, 'Celt');
    await removeCiv(page, 'Persia');

    await page.reload();
    await page.locator('#active-tbody tr').first().waitFor();

    const names = await activeCivNames(page);
    expect(names).not.toContain('Celt');
    expect(names).not.toContain('Persia');
    expect(names).toHaveLength(16);

    await expect(page.locator('#removed-section')).toBeVisible();
    expect(await page.locator('#removed-tbody .civ-name').allTextContents())
      .toEqual(['Celt', 'Persia']);
  });

  test('a removed civ that is added back returns in AST order and persists', async ({ page }) => {
    await openHelper(page);

    await removeCiv(page, 'Celt');   // AST 5
    await removeCiv(page, 'Persia'); // AST 12

    await page.locator('#removed-tbody tr', { has: page.getByText('Celt', { exact: true }) })
      .locator('.add-btn').click();

    const names = await activeCivNames(page);
    expect(names).toHaveLength(17);
    // AST 4 (Maurya), 5 (Celt), 6 (Babylon)
    expect(names.slice(3, 6)).toEqual(['Maurya', 'Celt', 'Babylon']);

    await page.reload();
    await page.locator('#active-tbody tr').first().waitFor();

    expect(await activeCivNames(page)).toContain('Celt');
    expect(await activeCivNames(page)).not.toContain('Persia');
    await expect(page.locator('#removed-tbody tr')).toHaveCount(1);
  });

  test('the "not in game" section hides again once every civ is back', async ({ page }) => {
    await openHelper(page);

    await removeCiv(page, 'Egypt');
    await expect(page.locator('#removed-section')).toBeVisible();

    await page.locator('#removed-tbody .add-btn').click();

    await expect(page.locator('#removed-section')).not.toBeVisible();
    await expect(page.locator('#active-tbody tr')).toHaveCount(18);
  });

  test('a civ added back gets a working census input and timer', async ({ page }) => {
    await openHelper(page);

    await removeCiv(page, 'Nubia');
    await page.locator('#removed-tbody .add-btn').click();

    await setCensus(page, 'Nubia', 7);
    await expect(rowFor(page, 'Nubia')).toHaveClass(/updated/);
    await expect(rowFor(page, 'Nubia').locator('.timer-start-btn')).toBeVisible();
  });
});
