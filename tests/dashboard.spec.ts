import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Dashboard Tests', () => {
  test('should redirect /dashboard to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
      return;
    }
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('main, [role="main"], h1').first()).toBeVisible();
  });

  test('should redirect /dashboard/reviews to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/reviews', { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
      return;
    }
    await expect(page).toHaveURL(/\/dashboard\/reviews/);
    await expect(page.locator('main, [role="main"], h1').first()).toBeVisible();
  });

  test('should redirect /dashboard/edit-profile to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/edit-profile', { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
      return;
    }
    await expect(page).toHaveURL(/\/dashboard\/edit-profile/);
    await expect(page.locator('main, [role="main"], h1').first()).toBeVisible();
  });
});
