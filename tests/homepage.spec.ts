import { test, expect } from '@playwright/test';

test.describe('Homepage Tests', () => {
  test('should load the homepage and show the main elements', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Check if the main heading is visible (dynamic based on site settings)
    await expect(page.locator('h1')).toContainText('Découvrez votre ville avec');

    // Check if the search input is visible
    await expect(page.locator('input[placeholder*="Restaurants"], input[placeholder*="Salons"], input[placeholder*="Hôtels"]')).toBeVisible();

    // Check if the search button is visible
    await expect(page.locator('button:has-text("Rechercher")')).toBeVisible();

    // Check if the seasonal collections section is visible
    await expect(page.locator('h2:has-text("Explorez par")')).toBeVisible();

    // Check if the featured businesses section is visible
    await expect(page.locator('h2:has-text("Parcourir par Catégorie")')).toBeVisible();
  });

  test('should be able to search for businesses', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Fill in the search input
    await page.locator('input[placeholder*="Restaurants"], input[placeholder*="Salons"], input[placeholder*="Hôtels"]').fill('Bimo Café');
    
    // Submit the search
    await page.locator('button:has-text("Rechercher")').click();

    // Check if we're on the search results page
    await expect(page).toHaveURL(/\/businesses/);
  });

  test('should navigate to a business page', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Click on a business card
    await page.locator('a[href*="/businesses/"]').first().click();

    // Check if we're on a business page
    await expect(page).toHaveURL(/\/businesses\/+/);
  });
});