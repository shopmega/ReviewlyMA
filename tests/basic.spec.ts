import { test, expect } from '@playwright/test';

test.describe('Basic Functionality Tests', () => {
  test('should load the homepage successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Check if the main heading is visible (dynamic based on site settings)
    await expect(page.locator('h1')).toContainText('Découvrez votre ville avec');

    // Check if the search input is visible
    await expect(page.locator('input[placeholder*="Restaurants"], input[placeholder*="Salons"], input[placeholder*="Hôtels"]')).toBeVisible();

    // Check if the search button is visible
    await expect(page.locator('button:has-text("Rechercher")')).toBeVisible();
  });

  test('should navigate to a business page', async ({ page }) => {
    // Navigate to a specific business page
    await page.goto('/businesses/bimo-cafe');

    // Check if business name is visible
    await expect(page.locator('h1')).toContainText('Bimo Café');
  });

  test('should navigate to signup page', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Click on the signup link/button (if it exists on the homepage)
    // If not on homepage, directly navigate to signup
    await page.goto('/signup');

    // Check if signup form is visible
    await expect(page.locator('text=Inscription')).toBeVisible();
    await expect(page.locator('input[name="full_name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});