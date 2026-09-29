const { test, expect } = require('@playwright/test');
const {
  openHelper,
  activeCivNames,
  setCensus,
  toggleMilitary,
  removeCiv
} = require('./helpers');

test.describe('Census helper – sorting', () => {
  test('sorts by census descending', async ({ page }) => {
    await openHelper(page);

    await setCensus(page, 'Egypt', 42);
    await setCensus(page, 'Minoa', 7);
    await setCensus(page, 'Kushan', 19);

    await page.locator('#sort-census-btn').click();

    const names = await activeCivNames(page);
    expect(names.slice(0, 3)).toEqual(['Egypt', 'Kushan', 'Minoa']);
  });

  test('breaks census ties by ascending AST rank', async ({ page }) => {
    await openHelper(page);

    // Hellas is AST 15, Celt is AST 5, Persia is AST 12 – all on 10 census.
    await setCensus(page, 'Hellas', 10);
    await setCensus(page, 'Celt', 10);
    await setCensus(page, 'Persia', 10);

    await page.locator('#sort-census-btn').click();

    const names = await activeCivNames(page);
    expect(names.slice(0, 3)).toEqual(['Celt', 'Persia', 'Hellas']);
  });

  test('every row with census 0 still falls out in AST order', async ({ page }) => {
    await openHelper(page);

    await page.locator('#sort-census-btn').click();

    expect(await activeCivNames(page)).toEqual([
      'Minoa', 'Saba', 'Assyria', 'Maurya', 'Celt', 'Babylon',
      'Carthage', 'Dravidia', 'Hatti', 'Kushan', 'Rome', 'Persia',
      'Iberia', 'Nubia', 'Hellas', 'Indus', 'Egypt', 'Parthia'
    ]);
  });

  test('a military civ sorts last no matter how high its census is', async ({ page }) => {
    await openHelper(page);

    await setCensus(page, 'Minoa', 99);
    await toggleMilitary(page, 'Minoa');
    await setCensus(page, 'Saba', 5);

    await page.locator('#sort-census-btn').click();

    const names = await activeCivNames(page);
    expect(names[names.length - 1]).toBe('Minoa');
    expect(names[0]).toBe('Saba');
  });

  test('military civs are ordered among themselves by census then AST', async ({ page }) => {
    await openHelper(page);

    // Non-military
    await setCensus(page, 'Saba', 30);   // AST 2
    await setCensus(page, 'Hatti', 12);  // AST 9

    // Military block: Carthage (AST 7) and Iberia (AST 13) tie on 8,
    // Parthia (AST 18) is above them on 15.
    for (const civ of ['Carthage', 'Iberia', 'Parthia']) {
      await toggleMilitary(page, civ);
    }
    await setCensus(page, 'Carthage', 8);
    await setCensus(page, 'Iberia', 8);
    await setCensus(page, 'Parthia', 15);

    await page.locator('#sort-census-btn').click();

    const names = await activeCivNames(page);
    // The three military civs occupy the last three rows, in census-desc
    // order with the AST tie-break between Carthage and Iberia.
    expect(names.slice(-3)).toEqual(['Parthia', 'Carthage', 'Iberia']);
    // ...and the non-military civs are all ahead of them.
    expect(names.slice(0, 2)).toEqual(['Saba', 'Hatti']);
  });

  test('turning military off puts the civ back in the main ordering', async ({ page }) => {
    await openHelper(page);

    await setCensus(page, 'Rome', 50);
    await toggleMilitary(page, 'Rome');
    await page.locator('#sort-census-btn').click();
    expect((await activeCivNames(page)).at(-1)).toBe('Rome');

    await toggleMilitary(page, 'Rome');
    await page.locator('#sort-census-btn').click();
    expect((await activeCivNames(page))[0]).toBe('Rome');
  });

  test('sorting only ever reorders the civs still in the game', async ({ page }) => {
    await openHelper(page);

    await setCensus(page, 'Indus', 25);
    await removeCiv(page, 'Indus');
    await setCensus(page, 'Nubia', 9);

    await page.locator('#sort-census-btn').click();

    const names = await activeCivNames(page);
    expect(names).toHaveLength(17);
    expect(names[0]).toBe('Nubia');
    expect(names).not.toContain('Indus');
  });
});
