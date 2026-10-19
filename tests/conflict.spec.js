const { test, expect } = require('@playwright/test');

const PAGE_URL = '/conflict.html';

async function openConflict(page) {
  await page.goto(PAGE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

const counters = (page) => page.locator('.counter');
const countOf = (page, i) => counters(page).nth(i).locator('.count');

test.describe('Conflict resolution helper', () => {
  test('starts with two unlabelled counters at zero', async ({ page }) => {
    await openConflict(page);
    await expect(counters(page)).toHaveCount(2);
    await expect(countOf(page, 0)).toHaveText('0');
    await expect(counters(page).nth(0).locator('.label')).toHaveValue('');
  });

  test('right half increments, left half decrements, never below zero', async ({ page }) => {
    await openConflict(page);
    const box = counters(page).nth(0).locator('.tap-area');
    const b = await box.boundingBox();
    await page.mouse.click(b.x + b.width * 0.9, b.y + b.height * 0.8);
    await page.mouse.click(b.x + b.width * 0.9, b.y + b.height * 0.8);
    await page.mouse.click(b.x + b.width * 0.9, b.y + b.height * 0.8);
    await expect(countOf(page, 0)).toHaveText('3');
    await page.mouse.click(b.x + b.width * 0.1, b.y + b.height * 0.8);
    await expect(countOf(page, 0)).toHaveText('2');
    await page.mouse.click(b.x + b.width * 0.1, b.y + b.height * 0.8);
    await page.mouse.click(b.x + b.width * 0.1, b.y + b.height * 0.8);
    await page.mouse.click(b.x + b.width * 0.1, b.y + b.height * 0.8);
    await expect(countOf(page, 0)).toHaveText('0');
    // The other counter is untouched.
    await expect(countOf(page, 1)).toHaveText('0');
  });

  test('clicking the count itself still counts by side', async ({ page }) => {
    await openConflict(page);
    const count = countOf(page, 1);
    const b = await count.boundingBox();
    await page.mouse.click(b.x + b.width * 0.75, b.y + b.height / 2);
    await expect(count).toHaveText('1');
  });

  test('label dropdown lists only the civs in play', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('mega-empires-not-in-game', JSON.stringify([{ ast: 17 }]));
    });
    await page.reload();
    const options = counters(page).nth(0).locator('.label option');
    await expect(options).toHaveCount(18);
    await expect(options.nth(0)).toHaveText('Civ');
    await expect(options.nth(1)).toHaveText('Minoa');
    await expect(options.filter({ hasText: 'Egypt' })).toHaveCount(0);
  });

  test('a saved civ taken out of play stays selected', async ({ page }) => {
    await openConflict(page);
    await counters(page).nth(0).locator('.label').selectOption('Egypt');
    await page.evaluate(() => {
      localStorage.setItem('mega-empires-not-in-game', JSON.stringify([{ ast: 17 }]));
    });
    await page.reload();
    await expect(counters(page).nth(0).locator('.label')).toHaveValue('Egypt');
    await expect(counters(page).nth(1).locator('.label option', { hasText: 'Egypt' })).toHaveCount(0);
  });

  test('choosing a label does not change the count', async ({ page }) => {
    await openConflict(page);
    await counters(page).nth(0).locator('.label').selectOption('Egypt');
    await expect(countOf(page, 0)).toHaveText('0');
  });

  test('counters can be added and removed', async ({ page }) => {
    await openConflict(page);
    await page.click('#add-btn');
    await expect(counters(page)).toHaveCount(3);
    await counters(page).nth(0).locator('.label').selectOption('Egypt');
    await counters(page).nth(1).locator('.label').selectOption('Babylon');
    await counters(page).nth(0).locator('.remove').click();
    await expect(counters(page)).toHaveCount(2);
    await expect(counters(page).nth(0).locator('.label')).toHaveValue('Babylon');
  });

  test('labels and counts persist, and reset zeroes counts but keeps labels', async ({ page }) => {
    await openConflict(page);
    await counters(page).nth(0).locator('.label').selectOption('Egypt');
    await counters(page).nth(0).locator('.half.inc').click();
    await counters(page).nth(0).locator('.half.inc').click();
    await page.reload();
    await expect(counters(page).nth(0).locator('.label')).toHaveValue('Egypt');
    await expect(countOf(page, 0)).toHaveText('2');
    await page.click('#reset-btn');
    await expect(countOf(page, 0)).toHaveText('0');
    await expect(counters(page).nth(0).locator('.label')).toHaveValue('Egypt');
  });

  test('Metalworking checkbox persists and does not change the count', async ({ page }) => {
    await openConflict(page);
    await counters(page).nth(1).locator('.mw-toggle').click();
    await expect(countOf(page, 1)).toHaveText('0');
    await page.reload();
    await expect(counters(page).nth(1).locator('.mw')).toBeChecked();
    await expect(counters(page).nth(0).locator('.mw')).not.toBeChecked();
  });

  test('City checkbox shows City instead of the count and hides the tap halves', async ({ page }) => {
    await openConflict(page);
    const box = counters(page).nth(0);
    await box.locator('.half.inc').click();
    await box.locator('.city-toggle').click();
    await expect(countOf(page, 0)).toHaveText('City');
    await expect(box.locator('.half.inc')).toBeHidden();
    await page.reload();
    await expect(countOf(page, 0)).toHaveText('City');
    await counters(page).nth(0).locator('.city-toggle').click();
    await expect(countOf(page, 0)).toHaveText('1');
  });

  test('only one counter can be a city', async ({ page }) => {
    await openConflict(page);
    await counters(page).nth(0).locator('.city-toggle').click();
    await counters(page).nth(1).locator('.city-toggle').click();
    await expect(counters(page).nth(0).locator('.city')).not.toBeChecked();
    await expect(counters(page).nth(1).locator('.city')).toBeChecked();
    await expect(countOf(page, 0)).toHaveText('0');
    await expect(countOf(page, 1)).toHaveText('City');
  });

  test('Engineering checkbox persists', async ({ page }) => {
    await openConflict(page);
    await counters(page).nth(0).locator('.eng-toggle').click();
    await page.reload();
    await expect(counters(page).nth(0).locator('.eng')).toBeChecked();
    await expect(counters(page).nth(1).locator('.eng')).not.toBeChecked();
  });

  test('population limit input persists', async ({ page }) => {
    await openConflict(page);
    await expect(page.locator('#pop-limit')).toHaveValue('0');
    await expect(page.locator('#pop-limit option')).toHaveText(['0', '1', '2', '3', '4']);
    await page.selectOption('#pop-limit', '3');
    await page.reload();
    await expect(page.locator('#pop-limit')).toHaveValue('3');
  });
});

test.describe('Resolve', () => {
  // A count of 'city' makes that counter a city.
  async function setup(page, counts, limit, metalworking = [], engineering = []) {
    await page.goto(PAGE_URL);
    await page.evaluate(({ counts, limit, metalworking, engineering }) => {
      localStorage.clear();
      localStorage.setItem('mega-empires-conflict-counters',
        JSON.stringify(counts.map((count, i) => ({
          label: '',
          count: count === 'city' ? 0 : count,
          city: count === 'city',
          metalworking: metalworking.includes(i),
          engineering: engineering.includes(i),
        }))));
      localStorage.setItem('mega-empires-conflict-limit', limit);
    }, { counts, limit, metalworking, engineering });
    await page.reload();
    await page.click('#resolve-btn');
  }

  async function expectCounts(page, expected) {
    await expect(counters(page).locator('.count')).toHaveText(expected.map(String));
  }

  test('limit 0 removes units until one counter is left', async ({ page }) => {
    // Round 1: 3->2, then 5->4. Round 2: 2->1, 4->3. Round 3: 1->0, stop.
    await setup(page, [5, 3], '0');
    await expectCounts(page, [3, 0]);
  });

  test('lowest loses first and stops once the total meets the limit', async ({ page }) => {
    // Total 6, limit 4: 1->0 (5), then 2->1 (4), stop before 3.
    await setup(page, [3, 2, 1], '4');
    await expectCounts(page, [3, 1, 0]);
  });

  test('tied counters lose units together', async ({ page }) => {
    // Total 7, limit 4: the two 2s drop together (5), then 3->2 (4).
    await setup(page, [2, 3, 2], '4');
    await expectCounts(page, [1, 2, 1]);
  });

  test('ties drop together even past the limit', async ({ page }) => {
    // Total 4, limit 3: both 2s drop at once, ending at 2.
    await setup(page, [2, 2], '3');
    await expectCounts(page, [1, 1]);
  });

  test('zero counters are ignored and nothing changes when already resolved', async ({ page }) => {
    await setup(page, [0, 3, 1], '4');
    await expectCounts(page, [0, 3, 1]);
  });

  test('result is saved', async ({ page }) => {
    await setup(page, [3, 2, 1], '4');
    await page.reload();
    await expectCounts(page, [3, 1, 0]);
  });

  test('Metalworking counter loses units after the others', async ({ page }) => {
    // Total 6, limit 4: the 1 has Metalworking, so 2->1 (5), 3->2 (4).
    await setup(page, [3, 2, 1], '4', [2]);
    await expectCounts(page, [2, 1, 1]);
  });

  test('Metalworking stops before its counter is touched once the limit is met', async ({ page }) => {
    // Total 4, limit 3: the 3 drops first even though the 1 is lower.
    await setup(page, [3, 1], '3', [1]);
    await expectCounts(page, [2, 1]);
  });

  test('two Metalworking counters go after the third, fewest first', async ({ page }) => {
    // Total 6, limit 4: 3->2 (5), then the Metalworking 1->0 (4).
    await setup(page, [3, 2, 1], '4', [1, 2]);
    await expectCounts(page, [2, 2, 0]);
  });

  test('Metalworking on every counter is the same as none', async ({ page }) => {
    await setup(page, [3, 2, 1], '4', [0, 1, 2]);
    await expectCounts(page, [3, 1, 0]);
  });

  test('with a city, the others fight down to one, ignoring the limit', async ({ page }) => {
    // Limit 4 would stop early; a city forces a limit of 0.
    // 3->2, 5->4; 2->1, 4->3; 1->0. 3 is under 7, so the city stands.
    await setup(page, [5, 3, 'city'], '4');
    await expectCounts(page, [3, 0, 'City']);
  });

  test('a survivor with 7 or more turns the city into 6 and resolves again', async ({ page }) => {
    // 2->1, 10->9; 1->0. 9 >= 7, so the city becomes 6.
    // Then 9 vs 6 with limit 4: both drop each round until the 6 is gone.
    await setup(page, [10, 2, 'city'], '4');
    await expectCounts(page, [4, 0, 0]);
    await expect(counters(page).nth(2).locator('.city')).not.toBeChecked();
  });

  test('a lone attacker against a city stops at the limit', async ({ page }) => {
    // City becomes 6; 7 vs 6 with limit 4 ends at 3 and 1.
    await setup(page, ['city', 7], '4');
    await expectCounts(page, [1, 3]);
  });

  test('Metalworking still applies once the city has become 6', async ({ page }) => {
    // 8 vs a Metalworking 6, limit 3: the 8 always drops first, ending 2 and 1.
    // (Without Metalworking it would end 3 and 0.)
    await setup(page, [8, 'city'], '3', [1]);
    await expectCounts(page, [2, 1]);
  });

  // With limit 0 the attacker ends with (attacker - city + 1) units, which
  // shows what the city became.
  test('attacker with Engineering needs only 6 and the city becomes 5', async ({ page }) => {
    await setup(page, [6, 'city'], '0', [], [0]);
    await expectCounts(page, [2, 0]);
  });

  test('attacker without Engineering cannot take a city with 6', async ({ page }) => {
    await setup(page, [6, 'city'], '0');
    await expectCounts(page, [6, 'City']);
  });

  test('city with Engineering needs 8 and becomes 7', async ({ page }) => {
    await setup(page, [7, 'city'], '0', [], [1]);
    await expectCounts(page, [7, 'City']);
    await setup(page, [8, 'city'], '0', [], [1]);
    await expectCounts(page, [2, 0]);
  });

  test('Engineering on both sides is the same as neither', async ({ page }) => {
    await setup(page, [6, 'city'], '0', [], [0, 1]);
    await expectCounts(page, [6, 'City']);
    await setup(page, [7, 'city'], '0', [], [0, 1]);
    await expectCounts(page, [2, 0]);
  });

  test('only the surviving attacker\'s Engineering counts', async ({ page }) => {
    // The 2 has Engineering but is wiped out; the 6 survives without it.
    await setup(page, [7, 2, 'city'], '4', [], [1]);
    await expectCounts(page, [6, 0, 'City']);
  });
});
