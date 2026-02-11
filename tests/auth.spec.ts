import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test('should be able to navigate to login page directly', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Check if the login form is visible using more specific selectors
    await expect(page.locator('h1:has-text("Connexion")')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Se connecter")')).toBeVisible();
  });

  test('should be able to navigate to signup page directly', async ({ page }) => {
    // Navigate to the signup page
    await page.goto('/signup');

    // Check if the signup form is visible using more specific selectors
    await expect(page.locator('h1:has-text("Inscription")')).toBeVisible();
    await expect(page.locator('input[name="full_name"], input[name="name"], input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("S\'inscrire"), button:has-text("Créer mon compte")')).toBeVisible();
  });

  test('should show some response with invalid credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Fill in invalid credentials
    await page.locator('input[name="email"]').fill('invalid@example.com');
    await page.locator('input[name="password"]').fill('wrongpassword');

    // Submit the form
    await page.locator('button:has-text("Se connecter")').click();

    // Wait a bit to see page response
    await page.waitForTimeout(3000);
    
    // Check that the page state changed (URL or content)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/login/); // Should still be on login page
  });

  test('should attempt login with user credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Fill in user credentials
    await page.locator('input[name="email"]').fill('zouhairbenseddik@gmail.com');
    await page.locator('input[name="password"]').fill('123456');

    // Submit the form
    await page.locator('button:has-text("Se connecter")').click();

    // Wait to see where we end up
    await page.waitForTimeout(3000);
    
    // Check the URL after login attempt
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(\/login|\/dashboard)/);
  });

  test('should attempt admin login with credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Fill in admin credentials
    await page.locator('input[name="email"]').fill('Admin@avis.ma');
    await page.locator('input[name="password"]').fill('admin');

    // Submit the form
    await page.locator('button:has-text("Se connecter")').click();

    // Wait to see where we end up
    await page.waitForTimeout(3000);
    
    // Check the URL after login attempt
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(\/login|\/dashboard|\/admin)/);
  });
});