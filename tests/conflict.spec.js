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
    const box = counters(page).nth(0);
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
});
