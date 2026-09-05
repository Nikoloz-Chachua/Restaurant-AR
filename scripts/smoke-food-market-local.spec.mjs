import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('Food & Market full catalogue renders all groups and contains drink bottles', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.goto('http://localhost:3000/?tenant=food-market-main&fm_catalogue=1', { waitUntil: 'networkidle' });
  await expect(page.locator('.menu-item').first()).toBeVisible();

  const totals = await page.evaluate(() => ({
    georgian: menuItems.filter(item => item.category?.startsWith('Georgian —')).length,
    asian: menuItems.filter(item => /^(Thai|Japanese) —/.test(item.category || '')).length,
    drinks: menuItems.filter(item => item.category?.startsWith('Drinks —')).length,
  }));
  expect(totals).toEqual({ georgian: 42, asian: 56, drinks: 130 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(await page.locator('.menu-item.no-image .thumb-wrap').count()).toBe(0);

  const drinksButton = page.locator('.group-btn').filter({ hasText: /Drinks|სასმელები/ }).first();
  await drinksButton.click();
  await expect(page.locator('.menu-item.food-market-drink .thumb-img').first()).toBeVisible();
  expect(await page.locator('.menu-item.food-market-drink .thumb-img').first().evaluate(element => getComputedStyle(element).objectFit)).toBe('contain');
  expect(await page.locator('.menu-item.food-market-drink .thumb-img').first().evaluate(element => getComputedStyle(element.closest('.thumb-wrap')).backgroundColor)).toBe('rgb(247, 243, 235)');
  expect(consoleErrors).toEqual([]);
});
