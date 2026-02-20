import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('User/Pro Critical Paths', () => {
  test('unauthenticated dashboard redirects to login with next', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('unauthenticated dashboard support redirects to login with next', async ({ page }) => {
    await page.goto('/dashboard/support', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('unauthenticated dashboard messages redirects to login with next', async ({ page }) => {
    await page.goto('/dashboard/messages', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('public pro landing responds', async ({ page }) => {
    const response = await page.goto('/pour-les-pros', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });
});
