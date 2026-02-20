import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Homepage Tests', () => {
  test('should load the homepage and show the main elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('h1')).toBeVisible();
    await expect(
      page.locator('input[type="search"], input[placeholder*="Entreprise"], input[placeholder*="mot-cl"]')
    ).toBeVisible();
    await expect(page.locator('button:has-text("Rechercher"), button[type="submit"]')).toBeVisible();
  });

  test('should be able to search for businesses', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const input = page.locator(
      'input[type="search"], input[placeholder*="Entreprise"], input[placeholder*="mot-cl"]'
    ).first();
    await input.fill('restaurant');
    await page.locator('button:has-text("Rechercher"), button[type="submit"]').first().click();
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('should navigate to a business page', async ({ page }) => {
    await page.goto('/businesses', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('a[href*="/businesses/"]').first().click();
    await expect(page).toHaveURL(/\/businesses\//);
  });
});
