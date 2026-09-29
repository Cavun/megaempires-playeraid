const { test, expect } = require('@playwright/test');
const {
  openHelper,
  keepOnly,
  keepCount,
  cityCivNames,
  cityRowFor,
  setCities,
  removeCityCiv,
  blockFor,
  allBlocks,
  activeCivNames
} = require('./helpers');

// The block each civ belongs to by default, per the printed AST: The West
// holds the odd ranks, The East the even ones. Assyria (AST 3) and Egypt
// (AST 17) are the only two that ever move, and only by player count.
const DEFAULT_BLOCKS = {
  Minoa: 'West',    Saba: 'East',     Assyria: 'West',  Maurya: 'East',
  Celt: 'West',     Babylon: 'East',  Carthage: 'West', Dravidia: 'East',
  Hatti: 'West',    Kushan: 'East',   Rome: 'West',     Persia: 'East',
  Iberia: 'West',   Nubia: 'East',    Hellas: 'West',   Indus: 'East',
  Egypt: 'West',    Parthia: 'East'
};

const expectedAssyria = (count) => (count >= 12 && count <= 16 ? 'East' : 'West');
const expectedEgypt   = (count) => (count >= 13 && count <= 14 ? 'East' : 'West');

test.describe('City table – block assignment', () => {
  test('blocks are hidden in games of 11 civs or fewer', async ({ page }) => {
    await openHelper(page);
    await keepCount(page, 11);

    await expect(page.locator('#cities-block-header')).toBeHidden();
    await expect(page.locator('#cities-tbody .block-cell')).toHaveCount(11);
    await expect(page.locator('#cities-tbody .block-cell:not(.hidden)')).toHaveCount(0);

    for (const block of Object.values(await allBlocks(page))) {
      expect(block).toBe('');
    }
  });

  test('blocks appear once the game reaches 12 civs', async ({ page }) => {
    await openHelper(page);
    await keepCount(page, 12);

    await expect(page.locator('#cities-block-header')).toBeVisible();
    await expect(page.locator('#cities-tbody .block-cell:not(.hidden)')).toHaveCount(12);
  });

  for (const count of [12, 13, 14, 15, 16, 17, 18]) {
    test(`in a ${count}-civ game Assyria is ${expectedAssyria(count)} and Egypt is ${expectedEgypt(count)}`,
      async ({ page }) => {
        await openHelper(page);
        await keepCount(page, count);

        expect(await blockFor(page, 'Assyria')).toBe(expectedAssyria(count));
        expect(await blockFor(page, 'Egypt')).toBe(expectedEgypt(count));
      });

    test(`no other civ changes block in a ${count}-civ game`, async ({ page }) => {
      await openHelper(page);
      await keepCount(page, count);

      const blocks = await allBlocks(page);
      expect(Object.keys(blocks)).toHaveLength(count);

      for (const [civ, block] of Object.entries(blocks)) {
        if (civ === 'Assyria' || civ === 'Egypt') continue;
        expect(block, `${civ} in a ${count}-civ game`).toBe(DEFAULT_BLOCKS[civ]);
      }
    });
  }

  test('the block colour follows the block', async ({ page }) => {
    await openHelper(page);
    await keepCount(page, 14);

    await expect(cityRowFor(page, 'Assyria').locator('.block-cell')).toHaveClass(/east/);
    await expect(cityRowFor(page, 'Assyria').locator('.block-cell')).not.toHaveClass(/west/);
    await expect(cityRowFor(page, 'Minoa').locator('.block-cell')).toHaveClass(/west/);
  });

  test('removing a civ re-evaluates the blocks live', async ({ page }) => {
    await openHelper(page);
    await keepCount(page, 15);

    expect(await blockFor(page, 'Assyria')).toBe('East');
    expect(await blockFor(page, 'Egypt')).toBe('West');

    // 15 -> 14 civs: Egypt joins Assyria in the East.
    await removeCityCiv(page, 'Minoa');
    expect(await blockFor(page, 'Egypt')).toBe('East');
    expect(await blockFor(page, 'Assyria')).toBe('East');

    // 14 -> 13 -> 12 civs: Egypt goes back West, Assyria stays East.
    await removeCityCiv(page, 'Saba');
    expect(await blockFor(page, 'Egypt')).toBe('East');
    await removeCityCiv(page, 'Maurya');
    expect(await blockFor(page, 'Egypt')).toBe('West');
    expect(await blockFor(page, 'Assyria')).toBe('East');

    // 12 -> 11 civs: blocks disappear entirely.
    await removeCityCiv(page, 'Celt');
    await expect(page.locator('#cities-block-header')).toBeHidden();
    expect(await blockFor(page, 'Assyria')).toBe('');
  });

  test('adding a civ back re-evaluates the blocks live', async ({ page }) => {
    await openHelper(page);
    await keepCount(page, 12);

    await page.locator('#removed-tbody tr').first().locator('.add-btn').click();

    expect(await blockFor(page, 'Assyria')).toBe(expectedAssyria(13));
    expect(await blockFor(page, 'Egypt')).toBe('East');
  });

  test('blocks survive a refresh', async ({ page }) => {
    await openHelper(page);
    await keepCount(page, 14);

    await page.reload();
    await page.locator('#cities-tbody tr').first().waitFor();

    expect(await blockFor(page, 'Assyria')).toBe('East');
    expect(await blockFor(page, 'Egypt')).toBe('East');
    expect(await blockFor(page, 'Rome')).toBe('West');
  });
});

test.describe('City table – row highlighting', () => {
  test('entering a city count turns that row green', async ({ page }) => {
    await openHelper(page);

    await expect(cityRowFor(page, 'Kushan')).not.toHaveClass(/updated/);

    await setCities(page, 'Kushan', 5);

    await expect(cityRowFor(page, 'Kushan')).toHaveClass(/updated/);
    await expect(cityRowFor(page, 'Rome')).not.toHaveClass(/updated/);
    await expect
      .poll(() => cityRowFor(page, 'Kushan').evaluate((el) => getComputedStyle(el).backgroundColor))
      .toMatch(/^rgba?\(58, 106, 48/);
  });

  test('sorting clears the green highlight from every row', async ({ page }) => {
    await openHelper(page);

    await setCities(page, 'Minoa', 2);
    await setCities(page, 'Saba', 3);
    await expect(page.locator('#cities-tbody tr.updated')).toHaveCount(2);

    await page.locator('#sort-cities-btn').click();

    await expect(page.locator('#cities-tbody tr.updated')).toHaveCount(0);
  });

  test('filling in every city count turns the rows back to normal', async ({ page }) => {
    await openHelper(page);
    await keepOnly(page, ['Minoa', 'Saba', 'Assyria']);

    await setCities(page, 'Minoa', 1);
    await setCities(page, 'Saba', 2);
    await expect(page.locator('#cities-tbody tr.updated')).toHaveCount(2);

    // Nothing resets while a row is still outstanding.
    await page.clock.runFor(2000);
    await expect(page.locator('#cities-tbody tr.updated')).toHaveCount(2);

    await setCities(page, 'Assyria', 3);
    await expect(page.locator('#cities-tbody tr.updated')).toHaveCount(3);

    // The reset is on an 800ms delay so the all-green state is visible.
    await page.clock.runFor(900);
    await expect(page.locator('#cities-tbody tr.updated')).toHaveCount(0);
  });

  test('the census table is not affected by city entries', async ({ page }) => {
    await openHelper(page);

    await setCities(page, 'Hatti', 4);

    await expect(page.locator('#active-tbody tr.updated')).toHaveCount(0);
  });
});

test.describe('City table – sorting', () => {
  test('sorts by city count ascending', async ({ page }) => {
    await openHelper(page);

    await setCities(page, 'Minoa', 9);
    await setCities(page, 'Saba', 4);
    await setCities(page, 'Assyria', 6);
    await setCities(page, 'Maurya', 1);

    await page.locator('#sort-cities-btn').click();

    const names = await cityCivNames(page);
    // Ascending, so everything still on 0 comes first and the four civs with
    // cities trail them in increasing order.
    expect(names.slice(-4)).toEqual(['Maurya', 'Saba', 'Assyria', 'Minoa']);
    expect(names[0]).toBe('Celt');
  });

  test('breaks city-count ties by ascending AST rank', async ({ page }) => {
    await openHelper(page);

    // Hellas is AST 15, Celt is AST 5, Persia is AST 12 – all on 3 cities.
    await setCities(page, 'Hellas', 3);
    await setCities(page, 'Celt', 3);
    await setCities(page, 'Persia', 3);
    // Everyone else sits on 0, so the three tied civs land at the bottom.

    await page.locator('#sort-cities-btn').click();

    expect((await cityCivNames(page)).slice(-3)).toEqual(['Celt', 'Persia', 'Hellas']);
  });

  test('rows still on zero fall out in AST order', async ({ page }) => {
    await openHelper(page);

    await page.locator('#sort-cities-btn').click();

    expect(await cityCivNames(page)).toEqual([
      'Minoa', 'Saba', 'Assyria', 'Maurya', 'Celt', 'Babylon',
      'Carthage', 'Dravidia', 'Hatti', 'Kushan', 'Rome', 'Persia',
      'Iberia', 'Nubia', 'Hellas', 'Indus', 'Egypt', 'Parthia'
    ]);
  });

  test('sorting the city table leaves the census table alone', async ({ page }) => {
    await openHelper(page);

    await setCities(page, 'Egypt', 1);
    await page.locator('#sort-cities-btn').click();

    // Egypt is the only civ with a city, so ascending order puts it last.
    expect((await cityCivNames(page)).at(-1)).toBe('Egypt');
    expect((await activeCivNames(page))[0]).toBe('Minoa');
  });

  test('sorting keeps each row with its own block', async ({ page }) => {
    await openHelper(page);
    await keepCount(page, 14);

    await setCities(page, 'Assyria', 7);
    await page.locator('#sort-cities-btn').click();

    expect((await cityCivNames(page)).at(-1)).toBe('Assyria');
    expect(await blockFor(page, 'Assyria')).toBe('East');
    expect(await blockFor(page, 'Minoa')).toBe('West');
  });
});

test.describe('City table – removing civilizations', () => {
  test('removing from the city table removes the civ everywhere', async ({ page }) => {
    await openHelper(page);

    await removeCityCiv(page, 'Dravidia');

    await expect(page.locator('#cities-tbody tr')).toHaveCount(17);
    expect(await cityCivNames(page)).not.toContain('Dravidia');
    expect(await activeCivNames(page)).not.toContain('Dravidia');
    await expect(page.locator('#removed-tbody .civ-name')).toHaveText('Dravidia');
  });

  test('a removed civ is ignored by the city sort', async ({ page }) => {
    await openHelper(page);

    await setCities(page, 'Minoa', 1);
    await setCities(page, 'Saba', 2);
    await removeCityCiv(page, 'Minoa');

    await page.locator('#sort-cities-btn').click();

    const names = await cityCivNames(page);
    expect(names).toHaveLength(17);
    expect(names).not.toContain('Minoa');
    expect(names.at(-1)).toBe('Saba');
  });

  test('city removals persist across a page refresh', async ({ page }) => {
    await openHelper(page);

    await removeCityCiv(page, 'Iberia');
    await removeCityCiv(page, 'Kushan');

    await page.reload();
    await page.locator('#cities-tbody tr').first().waitFor();

    const names = await cityCivNames(page);
    expect(names).toHaveLength(16);
    expect(names).not.toContain('Iberia');
    expect(names).not.toContain('Kushan');
    expect(await page.locator('#removed-tbody .civ-name').allTextContents())
      .toEqual(['Kushan', 'Iberia']);
  });

  test('a civ added back returns to the city table in AST order', async ({ page }) => {
    await openHelper(page);

    await removeCityCiv(page, 'Celt'); // AST 5
    await page.locator('#removed-tbody .add-btn').click();

    const names = await cityCivNames(page);
    expect(names).toHaveLength(18);
    expect(names.slice(3, 6)).toEqual(['Maurya', 'Celt', 'Babylon']);

    // ...with a working, highlighting city input.
    await setCities(page, 'Celt', 2);
    await expect(cityRowFor(page, 'Celt')).toHaveClass(/updated/);
  });
});
