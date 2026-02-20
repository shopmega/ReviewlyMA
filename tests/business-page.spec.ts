import { test, expect, Page } from '@playwright/test';

async function openFirstBusiness(page: Page) {
  await page.goto('/businesses', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const firstBusinessLink = page.locator('a[href*="/businesses/"]').first();
  await expect(firstBusinessLink).toBeVisible();
  await firstBusinessLink.click();
  await expect(page).toHaveURL(/\/businesses\/[^/]+$/);
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

test.describe('Business Page Tests', () => {
  test('should load a business details page from listing', async ({ page }) => {
    await openFirstBusiness(page);
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should render business media on the page', async ({ page }) => {
    await openFirstBusiness(page);
    await expect(page.locator('img').first()).toBeVisible();
  });

  test('should render insights/reviews area', async ({ page }) => {
    await openFirstBusiness(page);
    await expect(page.locator('section#insights, [role="tablist"]').first()).toBeVisible();
  });

  test('should navigate to the review form from business page', async ({ page }) => {
    await openFirstBusiness(page);
    const reviewLink = page.locator('a[href*="/review"]').first();
    await expect(reviewLink).toBeVisible();
    await reviewLink.click();

    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
      return;
    }

    await expect(page).toHaveURL(/\/businesses\/[^/]+\/review/);
    await expect(page.locator('form').first()).toBeVisible();
  });
});
