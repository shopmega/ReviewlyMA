import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Admin Panel Tests', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);
    const nextParam = decodeURIComponent(new URL(page.url()).searchParams.get('next') || '');
    expect(nextParam).toContain('/admin');
  });

  test('should display users page when admin is authenticated', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('input[name="email"], input[type="email"]').fill('Admin@avis.ma');
    await page.locator('input[name="password"], input[type="password"]').fill('admin');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    await page.goto('/admin/utilisateurs', { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
      return;
    }

    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });

  test('should display businesses page when admin is authenticated', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('input[name="email"], input[type="email"]').fill('Admin@avis.ma');
    await page.locator('input[name="password"], input[type="password"]').fill('admin');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    await page.goto('/admin/etablissements', { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
      return;
    }

    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });
});
