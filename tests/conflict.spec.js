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

  test('typing a label does not change the count', async ({ page }) => {
    await openConflict(page);
    await counters(page).nth(0).locator('.label').fill('Egypt');
    await expect(countOf(page, 0)).toHaveText('0');
  });

  test('counters can be added and removed', async ({ page }) => {
    await openConflict(page);
    await page.click('#add-btn');
    await expect(counters(page)).toHaveCount(3);
    await counters(page).nth(0).locator('.label').fill('Egypt');
    await counters(page).nth(1).locator('.label').fill('Babylon');
    await counters(page).nth(0).locator('.remove').click();
    await expect(counters(page)).toHaveCount(2);
    await expect(counters(page).nth(0).locator('.label')).toHaveValue('Babylon');
  });

  test('labels and counts persist, and reset zeroes counts but keeps labels', async ({ page }) => {
    await openConflict(page);
    await counters(page).nth(0).locator('.label').fill('Egypt');
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

  test('population limit input persists', async ({ page }) => {
    await openConflict(page);
    await page.fill('#pop-limit', '12');
    await page.reload();
    await expect(page.locator('#pop-limit')).toHaveValue('12');
  });
});

test.describe('Resolve', () => {
  // A count of 'city' makes that counter a city.
  async function setup(page, counts, limit, metalworking = []) {
    await page.goto(PAGE_URL);
    await page.evaluate(({ counts, limit, metalworking }) => {
      localStorage.clear();
      localStorage.setItem('mega-empires-conflict-counters',
        JSON.stringify(counts.map((count, i) => ({
          label: '',
          count: count === 'city' ? 0 : count,
          city: count === 'city',
          metalworking: metalworking.includes(i),
        }))));
      localStorage.setItem('mega-empires-conflict-limit', limit);
    }, { counts, limit, metalworking });
    await page.reload();
    await page.click('#resolve-btn');
  }

  async function expectCounts(page, expected) {
    await expect(counters(page).locator('.count')).toHaveText(expected.map(String));
  }

  test('blank limit removes units until one counter is left', async ({ page }) => {
    // Round 1: 3->2, then 5->4. Round 2: 2->1, 4->3. Round 3: 1->0, stop.
    await setup(page, [5, 3], '');
    await expectCounts(page, [3, 0]);
  });

  test('lowest loses first and stops once the total meets the limit', async ({ page }) => {
    // Total 10, limit 8: 2->1 (9), then 3->2 (8), stop before 5.
    await setup(page, [5, 3, 2], '8');
    await expectCounts(page, [5, 2, 1]);
  });

  test('tied counters lose units together', async ({ page }) => {
    // Total 11, limit 8: the two 3s drop together (9), then 5->4 (8).
    await setup(page, [3, 5, 3], '8');
    await expectCounts(page, [2, 4, 2]);
  });

  test('ties drop together even past the limit', async ({ page }) => {
    // Total 8, limit 7: both 4s drop at once, ending at 6.
    await setup(page, [4, 4], '7');
    await expectCounts(page, [3, 3]);
  });

  test('zero counters are ignored and nothing changes when already resolved', async ({ page }) => {
    await setup(page, [0, 4, 2], '6');
    await expectCounts(page, [0, 4, 2]);
  });

  test('result is saved', async ({ page }) => {
    await setup(page, [5, 3, 2], '8');
    await page.reload();
    await expectCounts(page, [5, 2, 1]);
  });

  test('Metalworking counter loses units after the others', async ({ page }) => {
    // Total 10, limit 7: the 2 has Metalworking, so 3->2 (9), 5->4 (8),
    // then 2->1 (7).
    await setup(page, [5, 3, 2], '7', [2]);
    await expectCounts(page, [4, 2, 1]);
  });

  test('Metalworking stops before its counter is touched once the limit is met', async ({ page }) => {
    // Total 6, limit 5: the 4 drops first even though the 2 is lower.
    await setup(page, [4, 2], '5', [1]);
    await expectCounts(page, [3, 2]);
  });

  test('two Metalworking counters go after the third, fewest first', async ({ page }) => {
    // Total 10, limit 7: 5->4 (9), then the Metalworking 2->1 (8), then 3->2 (7).
    await setup(page, [5, 3, 2], '7', [1, 2]);
    await expectCounts(page, [4, 2, 1]);
  });

  test('Metalworking on every counter is the same as none', async ({ page }) => {
    await setup(page, [5, 3, 2], '8', [0, 1, 2]);
    await expectCounts(page, [5, 2, 1]);
  });

  test('with a city, the others fight down to one, ignoring the limit', async ({ page }) => {
    // Limit 20 would normally stop at once; a city forces a limit of 0.
    // 3->2, 5->4; 2->1, 4->3; 1->0. 3 is under 7, so the city stands.
    await setup(page, [5, 3, 'city'], '20');
    await expectCounts(page, [3, 0, 'City']);
  });

  test('a survivor with 7 or more turns the city into 6 and resolves again', async ({ page }) => {
    // 2->1, 10->9; 1->0. 9 >= 7, so the city becomes 6.
    // Then with limit 12, total 15: 6->5 (14), 9->8 (13), 5->4 (12).
    await setup(page, [10, 2, 'city'], '12');
    await expectCounts(page, [8, 0, 4]);
    await expect(counters(page).nth(2).locator('.city')).not.toBeChecked();
  });

  test('a lone attacker against a city is checked at once', async ({ page }) => {
    // 7 >= 7: city becomes 6; limit 13 already met, nothing else changes.
    await setup(page, ['city', 7], '13');
    await expectCounts(page, [6, 7]);
  });

  test('Metalworking still applies once the city has become 6', async ({ page }) => {
    // City becomes 6 (Metalworking), so the 8 drops first: 8->7 (13), stop.
    await setup(page, [8, 'city'], '13', [1]);
    await expectCounts(page, [7, 6]);
  });
});
