const { test, expect } = require('@playwright/test');
const {
  openHelper,
  keepOnly,
  rowFor,
  setSharedTimer,
  startTimer,
  timerDisplay
} = require('./helpers');

const toasts = (page) => page.locator('#toast-container .toast');

test.describe('Census helper – timers', () => {
  test('the shared timer field sets the countdown for a row', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '01:30');
    await startTimer(page, 'Rome');

    const display = timerDisplay(page, 'Rome');
    await expect(display).toBeVisible();
    await expect(display).toHaveText('01:30');
    await expect(rowFor(page, 'Rome').locator('.timer-start-btn')).toBeHidden();
    await expect(rowFor(page, 'Rome').locator('.timer-stop-btn')).toBeVisible();

    await page.clock.runFor(1000);
    await expect(display).toHaveText('01:29');

    await page.clock.runFor(29000);
    await expect(display).toHaveText('01:00');
  });

  test('a bare number in the timer field is read as seconds', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '45');
    await startTimer(page, 'Saba');

    await expect(timerDisplay(page, 'Saba')).toHaveText('00:45');
  });

  test('an empty timer field does not start a countdown', async ({ page }) => {
    await openHelper(page);

    await startTimer(page, 'Saba');

    await expect(timerDisplay(page, 'Saba')).toBeHidden();
    await expect(rowFor(page, 'Saba').locator('.timer-start-btn')).toBeVisible();
    await expect(page.locator('#shared-timer-input')).toBeFocused();
  });

  test('the countdown runs for exactly the requested duration', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '00:20');
    await startTimer(page, 'Hatti');

    // One second short: still counting, nothing has fired.
    await page.clock.runFor(19000);
    await expect(timerDisplay(page, 'Hatti')).toHaveText('00:01');
    await expect(rowFor(page, 'Hatti')).not.toHaveClass(/timer-done/);
    await expect(toasts(page)).toHaveCount(0);

    // The twentieth second is the one that fires it.
    await page.clock.runFor(1000);
    await expect(rowFor(page, 'Hatti')).toHaveClass(/timer-done/);
    await expect(toasts(page)).toHaveCount(1);
  });

  test('the display turns urgent in the last ten seconds', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '00:15');
    await startTimer(page, 'Nubia');

    await page.clock.runFor(4000);
    await expect(timerDisplay(page, 'Nubia')).toHaveText('00:11');
    await expect(timerDisplay(page, 'Nubia')).not.toHaveClass(/urgent/);

    await page.clock.runFor(1000);
    await expect(timerDisplay(page, 'Nubia')).toHaveText('00:10');
    await expect(timerDisplay(page, 'Nubia')).toHaveClass(/urgent/);
  });

  test('stopping a timer cancels it', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '00:10');
    await startTimer(page, 'Indus');
    await page.clock.runFor(3000);

    await rowFor(page, 'Indus').locator('.timer-stop-btn').click();

    await expect(timerDisplay(page, 'Indus')).toBeHidden();
    await expect(rowFor(page, 'Indus').locator('.timer-start-btn')).toBeVisible();

    // Well past the original deadline – nothing fires.
    await page.clock.runFor(30000);
    await expect(rowFor(page, 'Indus')).not.toHaveClass(/timer-done/);
    await expect(toasts(page)).toHaveCount(0);
  });

  test('the timer applies to every civ in the game', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '00:05');

    const names = await page.locator('#active-tbody tr .civ-name').allTextContents();
    expect(names).toHaveLength(18);
    for (const name of names) {
      await startTimer(page, name);
      await expect(timerDisplay(page, name)).toHaveText('00:05');
    }

    await page.clock.runFor(5000);

    await expect(page.locator('#active-tbody tr.timer-done')).toHaveCount(18);
    await expect(toasts(page)).toHaveCount(18);
    for (const name of names) {
      await expect(toasts(page).filter({ hasText: name })).toHaveCount(1);
    }
  });

  test('timers run in parallel and keep their own durations', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '00:30');
    await startTimer(page, 'Minoa');

    await page.clock.runFor(10000);

    // A second civ starts later, with a different duration.
    await setSharedTimer(page, '00:05');
    await startTimer(page, 'Egypt');

    await expect(timerDisplay(page, 'Minoa')).toHaveText('00:20');
    await expect(timerDisplay(page, 'Egypt')).toHaveText('00:05');

    // Egypt finishes first, Minoa keeps counting down undisturbed.
    await page.clock.runFor(5000);
    await expect(rowFor(page, 'Egypt')).toHaveClass(/timer-done/);
    await expect(rowFor(page, 'Minoa')).not.toHaveClass(/timer-done/);
    await expect(timerDisplay(page, 'Minoa')).toHaveText('00:15');
    await expect(toasts(page)).toHaveCount(1);

    await page.clock.runFor(15000);
    await expect(rowFor(page, 'Minoa')).toHaveClass(/timer-done/);
    await expect(toasts(page)).toHaveCount(2);
  });

  test('the timer field is remembered across a page refresh', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '02:15');
    await page.reload();
    await page.locator('#active-tbody tr').first().waitFor();

    await expect(page.locator('#shared-timer-input')).toHaveValue('02:15');

    await startTimer(page, 'Rome');
    await expect(timerDisplay(page, 'Rome')).toHaveText('02:15');
  });
});

test.describe('Census helper – when a timer is up', () => {
  test('it makes a noise, raises an alert and flashes the row', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '00:03');
    await startTimer(page, 'Carthage');
    await page.clock.runFor(3000);

    // Noise.
    const beeps = await page.evaluate(() => window.__beeps);
    expect(beeps.length).toBeGreaterThan(0);
    expect(beeps.every((b) => b.frequency === 880)).toBe(true);

    // Alert.
    await expect(toasts(page)).toHaveCount(1);
    await expect(toasts(page)).toContainText('Carthage');
    await expect(toasts(page)).toContainText('TAP TO DISMISS');

    // Flash.
    const row = rowFor(page, 'Carthage');
    await expect(row).toHaveClass(/timer-done/);
    expect(await row.evaluate((el) => getComputedStyle(el).animationName)).toBe('flash-alert');
    expect(await row.evaluate((el) => getComputedStyle(el).animationIterationCount)).toBe('infinite');
  });

  test('dismissing the alert stops the flashing and turns the row green', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '00:03');
    await startTimer(page, 'Carthage');
    await page.clock.runFor(3000);

    await toasts(page).click();

    await expect(toasts(page)).toHaveCount(0);
    const row = rowFor(page, 'Carthage');
    await expect(row).not.toHaveClass(/timer-done/);
    await expect(row).toHaveClass(/updated/);
    await expect
      .poll(() => row.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toMatch(/^rgba?\(58, 106, 48/);
  });

  test('rows stay green until every row is green, then all reset', async ({ page }) => {
    await openHelper(page);
    await keepOnly(page, ['Minoa', 'Saba']);

    await setSharedTimer(page, '00:03');
    await startTimer(page, 'Minoa');
    await startTimer(page, 'Saba');
    await page.clock.runFor(3000);

    await expect(toasts(page)).toHaveCount(2);

    // Dismiss the first alert – that row goes green and stays green while
    // the other row is still outstanding.
    await toasts(page).filter({ hasText: 'Minoa' }).click();
    await expect(rowFor(page, 'Minoa')).toHaveClass(/updated/);
    await page.clock.runFor(2000);
    await expect(rowFor(page, 'Minoa')).toHaveClass(/updated/);

    // Dismissing the last alert makes every row green, and after the short
    // all-green pause they all go back to normal.
    await toasts(page).filter({ hasText: 'Saba' }).click();
    await expect(page.locator('#active-tbody tr.updated')).toHaveCount(2);

    await page.clock.runFor(900);
    await expect(page.locator('#active-tbody tr.updated')).toHaveCount(0);
  });

  test('a finished timer can be started again', async ({ page }) => {
    await openHelper(page);

    await setSharedTimer(page, '00:03');
    await startTimer(page, 'Maurya');
    await page.clock.runFor(3000);
    await toasts(page).click();

    await expect(rowFor(page, 'Maurya').locator('.timer-start-btn')).toBeVisible();
    await startTimer(page, 'Maurya');
    await expect(timerDisplay(page, 'Maurya')).toHaveText('00:03');

    await page.clock.runFor(3000);
    await expect(rowFor(page, 'Maurya')).toHaveClass(/timer-done/);
    await expect(toasts(page)).toHaveCount(1);
  });
});
