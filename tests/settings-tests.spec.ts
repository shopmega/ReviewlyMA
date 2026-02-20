import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Site Settings Tests', () => {
  test('homepage should render without server errors', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('about page should render without server errors', async ({ page }) => {
    const response = await page.goto('/about', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('contact page should render without server errors', async ({ page }) => {
    const response = await page.goto('/contact', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('admin settings route should be protected for unauthenticated users', async ({ page }) => {
    await page.goto('/admin/parametres', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('admin root route should be protected for unauthenticated users', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('homepage should survive hard reload with same shell visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('h1').first()).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('settings api should respond with an expected status class', async ({ page }) => {
    const response = await page.request.get('/api/settings');
    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test('homepage should render in isolated browser context', async ({ page }) => {
    const browser = page.context().browser();
    if (!browser) {
      throw new Error('Browser instance not available');
    }

    const isolatedContext = await browser.newContext();
    const isolatedPage = await isolatedContext.newPage();

    const response = await isolatedPage.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(isolatedPage.locator('h1').first()).toBeVisible();

    await isolatedContext.close();
  });
});
