import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Critical Path Tests', () => {
  test('homepage should load and expose core search UI', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);

    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('input[type="search"], input[placeholder*="Entreprise"], input[placeholder*="mot-cl"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Rechercher"), button[type="submit"]').first()).toBeVisible();
  });

  test('business list should load and allow opening a business page', async ({ page }) => {
    await page.goto('/businesses', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/businesses/);

    const firstBusinessLink = page.locator('a[href*="/businesses/"]').first();
    await expect(firstBusinessLink).toBeVisible();
    await firstBusinessLink.click();

    await expect(page).toHaveURL(/\/businesses\/[^/]+$/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('review route should enforce authentication', async ({ page }) => {
    await page.goto('/review', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('admin routes should enforce authentication', async ({ page }) => {
    for (const route of ['/admin', '/admin/utilisateurs', '/admin/announcements/new']) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await expect(page).toHaveURL(/\/login\?next=/);
    }
  });

  test('pro page and legal pages should remain reachable', async ({ page }) => {
    for (const route of ['/pour-les-pros', '/about', '/contact']) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 120000 });
      expect(response?.status() ?? 500).toBeLessThan(500);
      await expect(page.locator('h1, main, [role="main"]').first()).toBeVisible();
    }
  });
});
