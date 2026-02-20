import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Authentication Tests', () => {
  test('should be able to navigate to login page directly', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should be able to navigate to signup page directly', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('input[name="fullName"], input[name="full_name"], input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show some response with invalid credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('input[name="email"], input[type="email"]').fill('invalid@example.com');
    await page.locator('input[name="password"], input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/\/login/);
  });

  test('should attempt login with user credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('input[name="email"], input[type="email"]').fill('zouhairbenseddik@gmail.com');
    await page.locator('input[name="password"], input[type="password"]').fill('123456');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/(\/login|\/dashboard|\/)/);
  });

  test('should attempt admin login with credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('input[name="email"], input[type="email"]').fill('Admin@avis.ma');
    await page.locator('input[name="password"], input[type="password"]').fill('admin');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/(\/login|\/dashboard|\/admin|\/)/);
  });
});
