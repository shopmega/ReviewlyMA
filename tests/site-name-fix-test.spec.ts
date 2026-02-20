import { test, expect } from '@playwright/test';

test('Verify homepage no longer exposes legacy Platform placeholder in key title surfaces', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });

  const mainHeading = (await page.textContent('h1')) || '';
  const pageTitle = await page.title();

  expect(mainHeading.toLowerCase()).not.toContain('platform');
  expect(pageTitle.toLowerCase()).not.toContain('platform');

  const platformElements = page.locator(':text("Platform")');
  const platformCount = await platformElements.count();
  expect(platformCount).toBe(0);
});
