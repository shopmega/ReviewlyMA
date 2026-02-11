import { test, expect } from '@playwright/test';

test.describe('Business Page Tests', () => {
  test('should display business details correctly', async ({ page }) => {
    // Navigate to a specific business page (using Bimo Café as an example)
    await page.goto('/businesses/bimo-cafe');

    // Check if business name is visible
    await expect(page.locator('h1')).toContainText('Bimo Café');

    // Check if business category is visible
    await expect(page.locator('text=Café & Restaurant')).toBeVisible();

    // Check if business location is visible
    await expect(page.locator('text=Agdal, Rabat')).toBeVisible();

    // Check if rating is visible
    await expect(page.locator('[data-testid="star-rating"]')).toBeVisible();

    // Check if business description is visible
    await expect(page.locator('text=Café moderne proposant des spécialités de café et des pâtisseries fines.')).toBeVisible();
  });

  test('should display business photos', async ({ page }) => {
    // Navigate to a specific business page
    await page.goto('/businesses/bimo-cafe');

    // Check if the photo gallery is visible
    await expect(page.locator('[data-testid="photo-gallery"]')).toBeVisible();

    // Check if at least one photo is visible
    await expect(page.locator('img').first()).toBeVisible();
  });

  test('should display business reviews', async ({ page }) => {
    // Navigate to a specific business page
    await page.goto('/businesses/bimo-cafe');

    // Check if reviews section is visible
    await expect(page.locator('text=Avis')).toBeVisible();

    // Check if at least one review is visible
    await expect(page.locator('[data-testid="review-card"]').first()).toBeVisible();
  });

  test('should allow submitting a review', async ({ page }) => {
    // Navigate to a specific business page
    await page.goto('/businesses/bimo-cafe');

    // Click on the "Laisser un avis" button
    await page.locator('text=Laisser un avis').click();

    // Check if we're redirected to the review page
    await expect(page).toHaveURL(/\/review/);

    // Check if the review form is visible
    await expect(page.locator('text=Donnez votre avis')).toBeVisible();
  });
});