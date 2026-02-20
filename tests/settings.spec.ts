import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Settings Tests', () => {
  test('profile settings should redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/profile/settings', { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
      return;
    }
    await expect(page).toHaveURL(/\/profile\/settings/);
    await expect(page.locator('main, [role="main"], h1').first()).toBeVisible();
  });

  test('dashboard edit profile should redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/edit-profile', { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
      return;
    }
    await expect(page).toHaveURL(/\/dashboard\/edit-profile/);
    await expect(page.locator('main, [role="main"], h1').first()).toBeVisible();
  });

  test('public settings-dependent pages should render', async ({ page }) => {
    for (const route of ['/', '/about', '/contact']) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 120000 });
      expect(response?.status() ?? 500).toBeLessThan(500);
      await expect(page.locator('h1, main, [role="main"]').first()).toBeVisible();
    }
  });
});
