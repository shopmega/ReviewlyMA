import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('CI Critical Paths', () => {
  test('homepage loads without server error', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });

  test('login page renders form controls', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('signup page renders form controls', async ({ page }) => {
    const response = await page.goto('/signup', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('unauthenticated admin access redirects to login with next', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);

    const current = new URL(page.url());
    const nextParam = decodeURIComponent(current.searchParams.get('next') || '');
    expect(nextParam).toContain('/admin');
  });

  test('unauthenticated review route redirects to login with next', async ({ page }) => {
    await page.goto('/review', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);

    const current = new URL(page.url());
    const nextParam = decodeURIComponent(current.searchParams.get('next') || '');
    expect(nextParam).toContain('/review');
  });

  test('business listing route responds and renders', async ({ page }) => {
    const response = await page.goto('/businesses', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(page).toHaveURL(/\/businesses/);
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('health endpoint responds', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.status()).toBeLessThan(500);
  });
});
