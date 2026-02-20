import { test, expect, Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function openFirstBusiness(page: Page) {
  await page.goto('/businesses', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const firstBusinessLink = page.locator('a[href*="/businesses/"]').first();
  await expect(firstBusinessLink).toBeVisible();
  await firstBusinessLink.click();
  await expect(page).toHaveURL(/\/businesses\/[^/]+$/);
}

async function goToReviewForm(page: Page) {
  await openFirstBusiness(page);
  const reviewLink = page.locator('a[href*="/review"]').first();
  await expect(reviewLink).toBeVisible();
  await reviewLink.click();
}

test.describe('Reviews Tests', () => {
  test.setTimeout(120000);

  test('should expose review entrypoint from business page', async ({ page }) => {
    await openFirstBusiness(page);
    await expect(page.locator('a[href*="/review"]').first()).toBeVisible();
  });

  test('should navigate to review form from business page', async ({ page }) => {
    await goToReviewForm(page);
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
      return;
    }
    await expect(page).toHaveURL(/\/businesses\/[^/]+\/review/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should render review form fields', async ({ page }) => {
    await goToReviewForm(page);

    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
      return;
    }

    await expect(page).toHaveURL(/\/businesses\/[^/]+\/review/);
    await expect(page.locator('form').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="service"], input[name="title"]').first()).toBeVisible();
    await expect(page.locator('textarea, textarea[name="text"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('should keep anonymous/public toggle available', async ({ page }) => {
    await goToReviewForm(page);
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login\?next=/);
      return;
    }
    await expect(page).toHaveURL(/\/businesses\/[^/]+\/review/);
    await expect(page.locator('button[role="switch"]').first()).toBeVisible();
  });
});
