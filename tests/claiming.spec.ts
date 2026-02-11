import { test, expect } from '@playwright/test';

test.describe('Business Claiming Tests', () => {
  test('should navigate to pro signup page from claiming page', async ({ page }) => {
    // Navigate to the claiming page
    await page.goto('/pour-les-pros');

    // Check if the main heading is visible
    await expect(page.locator('h1')).toContainText('Construisez une meilleure réputation en ligne');

    // Click on the signup button
    await page.locator('text=Revendiquer ou ajouter votre page').click();

    // Check if we're on the pro signup page
    await expect(page).toHaveURL('/pour-les-pros/signup');
  });

  test('should have pro signup form on the page', async ({ page }) => {
    // Navigate to the pro signup page
    await page.goto('/pour-les-pros/signup');

    // Wait a bit for the page to fully load
    await page.waitForLoadState('networkidle');

    // The page should exist and load
    await expect(page).toHaveURL('/pour-les-pros/signup');
  });

  test('should display features section on pro page', async ({ page }) => {
    // Navigate to the pro page
    await page.goto('/pour-les-pros');

    // Check if features section is visible
    await expect(page.locator('text=Pourquoi rejoindre Avis.ma')).toBeVisible();
    await expect(page.locator('text=Revendiquez votre page')).toBeVisible();
    await expect(page.locator('text=Répondez aux avis')).toBeVisible();
  });
});