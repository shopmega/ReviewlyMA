import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Business Claiming Tests', () => {
  test('should load pro landing page and show primary CTA', async ({ page }) => {
    await page.goto('/pour-les-pros', { waitUntil: 'domcontentloaded', timeout: 120000 });

    await expect(page.locator('h1').first()).toContainText(/Propulsez votre/i);
    await expect(page.locator('a[href="/pour-les-pros/signup"]').first()).toBeVisible();
  });

  test('should load pro signup page or redirect authenticated user to claim flow', async ({ page }) => {
    await page.goto('/pour-les-pros/signup', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/claim')) {
      await expect(page).toHaveURL(/\/claim/);
      return;
    }

    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
      return;
    }

    await expect(page).toHaveURL(/\/pour-les-pros\/signup/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to signup from pro page CTA', async ({ page }) => {
    await page.goto('/pour-les-pros', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('a[href="/pour-les-pros/signup"]').first().click();
    await expect(page).toHaveURL(/(\/pour-les-pros\/signup|\/claim)/);
  });
});
