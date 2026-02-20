import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Basic Functionality Tests', () => {
  test('should load the homepage successfully', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("Rechercher"), button[type="submit"]')).toBeVisible();
  });

  test('should navigate to a business page', async ({ page }) => {
    await page.goto('/businesses', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('a[href*="/businesses/"]').first().click();
    await expect(page).toHaveURL(/\/businesses\//);
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('input[name="fullName"], input[name="full_name"], input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
  });
});
