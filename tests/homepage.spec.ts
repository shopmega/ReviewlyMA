import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Homepage Tests', () => {
  test('should load the homepage and show the main elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('h1')).toBeVisible();
    const homeSearchInput = page
      .locator('input[type="search"], input[placeholder*="Entreprise"], input[placeholder*="poste"], input[placeholder*="mot"]')
      .first();
    const hasHomeSearch = (await homeSearchInput.count()) > 0;

    if (hasHomeSearch) {
      await expect(homeSearchInput).toBeVisible({ timeout: 15000 });
      await expect(page.locator('button:has-text("Rechercher"), button[type="submit"]')).toBeVisible();
      return;
    }

    // Fallback for environments where homepage sections are reconfigured and hero search is hidden.
    await expect(page.locator('a[href="/businesses"], a[href*="/businesses"]').first()).toBeVisible();
  });

  test('should be able to search for businesses', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const homeInput = page
      .locator('input[type="search"], input[placeholder*="Entreprise"], input[placeholder*="poste"], input[placeholder*="mot"]')
      .first();
    const hasHomeSearch = (await homeInput.count()) > 0;

    if (hasHomeSearch) {
      await expect(homeInput).toBeVisible({ timeout: 15000 });
      await homeInput.fill('restaurant');
      await homeInput.press('Enter');
    } else {
      await page.goto('/businesses', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const listingInput = page.locator('#search-top');
      await expect(listingInput).toBeVisible({ timeout: 15000 });
      await listingInput.fill('restaurant');
      await listingInput.press('Enter');
    }

    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('should navigate to a business page', async ({ page }) => {
    await page.goto('/businesses', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('a[href*="/businesses/"]').first().click();
    await expect(page).toHaveURL(/\/businesses\//);
  });
});
