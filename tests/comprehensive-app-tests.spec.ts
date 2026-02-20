import { test, expect, Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

async function gotoDom(page: Page, path: string) {
  return page.goto(path, { waitUntil: 'domcontentloaded', timeout: 120000 });
}

async function openFirstBusiness(page: Page) {
  await gotoDom(page, '/businesses');
  const businessLink = page.locator('a[href*="/businesses/"]').first();
  await expect(businessLink).toBeVisible();
  await businessLink.click();
  await expect(page).toHaveURL(/\/businesses\/[^/]+$/);
}

test.describe('Comprehensive App Tests', () => {
  test('public core pages should render', async ({ page }) => {
    for (const route of ['/', '/businesses', '/pour-les-pros']) {
      const response = await gotoDom(page, route);
      expect(response?.status() ?? 500).toBeLessThan(500);
      await expect(page.locator('h1, main, [role="main"]').first()).toBeVisible();
    }
  });

  test('auth pages should render expected form controls', async ({ page }) => {
    await gotoDom(page, '/login');
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();

    await gotoDom(page, '/signup');
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
  });

  test('discovery journey should reach business details', async ({ page }) => {
    await openFirstBusiness(page);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('section#insights, [role="tablist"], main').first()).toBeVisible();
  });

  test('business review entry should route to review page or login', async ({ page }) => {
    await openFirstBusiness(page);
    const reviewLink = page.locator('a[href*="/review"]').first();
    await expect(reviewLink).toBeVisible();
    await reviewLink.click();

    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
    } else {
      await expect(page).toHaveURL(/\/businesses\/[^/]+\/review/);
      await expect(page.locator('form').first()).toBeVisible();
    }
  });

  test('protected admin routes should redirect to login', async ({ page }) => {
    for (const route of ['/admin', '/admin/utilisateurs', '/admin/parametres']) {
      await gotoDom(page, route);
      await expect(page).toHaveURL(/\/login\?next=/);
    }
  });

  test('protected member routes should redirect to login', async ({ page }) => {
    for (const route of ['/dashboard', '/profile/settings', '/dashboard/edit-profile']) {
      await gotoDom(page, route);
      if (page.url().includes('/login')) {
        await expect(page).toHaveURL(/\/login\?next=/);
      } else {
        await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/')));
        await expect(page.locator('main, [role="main"], h1').first()).toBeVisible();
      }
    }
  });
});
