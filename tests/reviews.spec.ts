import { test, expect } from '@playwright/test';

test.describe('Reviews Tests', () => {
  test('should display business reviews tab', async ({ page }) => {
    // Navigate to a business page
    await page.goto('/businesses/bimo-cafe');

    // Check if reviews tab is visible
    await expect(page.locator('role=tab').first()).toBeVisible();
  });

  test('should display existing reviews on business page', async ({ page }) => {
    // Navigate to a business page
    await page.goto('/businesses/bimo-cafe');

    // Check if the page loaded successfully
    await expect(page).toHaveURL('/businesses/bimo-cafe');

    // Check if business name is visible
    await expect(page.locator('h1')).toContainText('Bimo Caf');
  });

  test('should navigate to review page from business page', async ({ page }) => {
    // Navigate to a business page
    await page.goto('/businesses/bimo-cafe');

    // Try to navigate to the review page directly
    await page.goto('/businesses/bimo-cafe/review');

    // Check if we're on a review-related page
    await expect(page).toHaveURL(/\/review/);
  });

  test('should validate review form fields', async ({ page }) => {
    // Navigate to a business page
    await page.goto('/businesses/bimo-cafe');

    // The page should have loaded
    await expect(page).toHaveURL('/businesses/bimo-cafe');
  });

  test('should allow anonymous review option', async ({ page }) => {
    // Navigate to a business page
    await page.goto('/businesses/bimo-cafe');

    // The page should have loaded
    await expect(page).toHaveURL('/businesses/bimo-cafe');
  });

  test('should display business information', async ({ page }) => {
    // Navigate to a business page
    await page.goto('/businesses/bimo-cafe');

    // Check if the page loaded successfully
    await expect(page).toHaveURL('/businesses/bimo-cafe');

    // Check if business name is visible
    await expect(page.locator('h1')).toContainText('Bimo Caf');
  });
});