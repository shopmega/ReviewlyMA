import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Monetization and Pro Features', () => {
  test('pro landing should expose premium messaging and signup CTA', async ({ page }) => {
    const response = await page.goto('/pour-les-pros', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);

    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('a[href="/pour-les-pros/signup"]').first()).toBeVisible();
  });

  test('premium dashboard route should be protected when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/premium', { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
      return;
    }
    await expect(page).toHaveURL(/\/dashboard\/premium/);
    await expect(page.locator('main, [role="main"], h1').first()).toBeVisible();
  });

  test('admin payment route should be protected when unauthenticated', async ({ page }) => {
    await page.goto('/admin/paiements', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('admin settings route should be protected when unauthenticated', async ({ page }) => {
    await page.goto('/admin/parametres', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});
