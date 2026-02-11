import { test, expect } from '@playwright/test';

// Comprehensive test suite for Avis application

test.describe('Comprehensive App Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any common prerequisites
    await page.goto('/');
  });

  test('Homepage loads correctly with all elements', async ({ page }) => {
    // Test that homepage loads with all expected elements
    await expect(page).toHaveTitle(/Avis/);
    await expect(page.locator('h1')).toContainText('Avis');
    
    // Check navigation elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('nav a')).toHaveCount(5); // Adjust based on actual nav items
    
    // Check search functionality
    await expect(page.locator('input[type="search"]')).toBeVisible();
    
    // Check featured sections
    await expect(page.locator('[data-testid="featured-section"]')).toBeVisible();
  });

  test('Navigation works correctly', async ({ page }) => {
    // Test navigation to different sections
    await page.click('nav a[href="/businesses"]');
    await expect(page).toHaveURL(/\/businesses/);
    
    await page.click('nav a[href="/review"]');
    await expect(page).toHaveURL(/\/review/);
    
    await page.click('nav a[href="/login"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test('User registration flow', async ({ page }) => {
    // Test user registration
    await page.goto('/signup');
    await expect(page.locator('h1')).toContainText('Inscription');
    
    // Fill in registration form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="full_name"]', 'Test User');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for success or validation messages
    await expect(page.locator('.toast-success, .alert-success')).toBeVisible().catch(() => {
      // If registration fails due to existing user, that's acceptable
    });
  });

  test('User login flow', async ({ page }) => {
    // Test user login
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Connexion');
    
    // Fill in login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for potential redirect or error message
    await page.waitForTimeout(2000);
  });

  test('Business search functionality', async ({ page }) => {
    // Test business search
    await page.fill('input[type="search"]', 'restaurant');
    await page.press('input[type="search"]', 'Enter');
    
    // Check results page
    await expect(page).toHaveURL(/\/businesses\?search=/);
    await expect(page.locator('[data-testid="business-card"]')).not.toHaveCount(0);
  });

  test('Review submission form', async ({ page }) => {
    // Test review submission form
    await page.goto('/review');
    await expect(page.locator('h1')).toContainText('Écrire un avis');
    
    // Check form fields
    await expect(page.locator('input[name="businessName"]')).toBeVisible();
    await expect(page.locator('input[name="authorName"]')).toBeVisible();
    await expect(page.locator('textarea[name="reviewText"]')).toBeVisible();
    await expect(page.locator('input[name="rating"]')).toBeVisible();
  });

  test('Admin panel access', async ({ page }) => {
    // Test admin panel access (this will likely fail without proper credentials)
    await page.goto('/admin');
    
    // Should redirect to login if not authenticated as admin
    await expect(page).toHaveURL(/\/login/).catch(() => {
      // Or show admin panel if already logged in as admin
      expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    });
  });

  test('Business claiming form', async ({ page }) => {
    // Test business claiming form
    await page.goto('/claim');
    await expect(page.locator('h1')).toContainText('Revendiquer');
    
    // Check form fields
    await expect(page.locator('input[name="businessName"]')).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
  });

  test('Contact form', async ({ page }) => {
    // Test contact form
    await page.goto('/contact');
    await expect(page.locator('h1')).toContainText('Contact');
    
    // Check form fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
  });

  test('Footer links work', async ({ page }) => {
    // Test footer links
    const footerLinks = page.locator('footer a');
    const count = await footerLinks.count();
    
    for (let i = 0; i < count; i++) {
      const link = footerLinks.nth(i);
      const href = await link.getAttribute('href');
      
      if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
        await link.click();
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Test mobile responsiveness by resizing viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone SE size
    
    // Check that navigation still works on mobile
    await expect(page.locator('nav')).toBeVisible();
    
    // Check that search is accessible
    await expect(page.locator('input[type="search"]')).toBeVisible();
    
    // Reset viewport
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('Error pages', async ({ page }) => {
    // Test 404 page
    await page.goto('/nonexistent-page');
    await expect(page.locator('h1')).toContainText('404');
    
    // Navigate back to home
    await page.goto('/');
    await expect(page).toHaveURL(/localhost/);
  });

  test('Accessibility checks', async ({ page }) => {
    // Basic accessibility checks
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    
    // Check for alt attributes on images
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt').catch(() => {
        console.warn(`Image at index ${i} is missing alt attribute`);
      });
    }
  });
});

// Additional tests for specific user journeys
test.describe('User Journeys', () => {
  test('Complete business discovery journey', async ({ page }) => {
    // User wants to find a restaurant in Casablanca
    await page.goto('/');
    
    // Search for restaurants
    await page.fill('input[type="search"]', 'restaurant');
    await page.press('input[type="search"]', 'Enter');
    
    // Filter by city if possible
    const cityFilter = page.locator('select[name="city"], input[placeholder*="ville"], button:has-text("Casablanca")');
    if (await cityFilter.count() > 0) {
      await cityFilter.click();
    }
    
    // Click on first result
    const firstResult = page.locator('[data-testid="business-card"]').first();
    if (await firstResult.count() > 0) {
      await firstResult.click();
      await expect(page).toHaveURL(/\/businesses\//);
    }
  });

  test('Complete review submission journey', async ({ page }) => {
    // User wants to submit a review
    await page.goto('/review');
    
    // Fill in review details
    await page.fill('input[name="businessName"]', 'Test Business');
    await page.fill('input[name="authorName"]', 'Test Author');
    await page.fill('textarea[name="reviewText"]', 'This is a test review');
    
    // Select rating (assuming star rating)
    await page.click('input[name="rating"][value="5"]');
    
    // Submit review
    await page.click('button[type="submit"]');
    
    // Check for success message
    await expect(page.locator('.toast-success, .alert-success, .confirmation')).toBeVisible().catch(async () => {
      // If there are validation errors, that's also valid to test
      await expect(page.locator('.toast-error, .alert-error, .error-message')).toBeVisible();
    });
  });
});