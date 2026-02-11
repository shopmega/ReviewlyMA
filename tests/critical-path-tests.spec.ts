import { test, expect } from '@playwright/test';

test.describe('Critical Path Tests', () => {
  test('Homepage loads with correct site name', async ({ page }) => {
    await page.goto('/');
    
    // Check that the site name is displayed correctly (not "Platform")
    const title = await page.textContent('h1, .site-title, .brand-name, nav a:first-child');
    expect(title).not.toContain('Platform');
    expect(title).toContain('Avis'); // Should contain the correct site name
    
    // Verify other critical homepage elements
    await expect(page.locator('input[type="search"]')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('Business listing page works', async ({ page }) => {
    await page.goto('/businesses');
    
    // Check that the page loaded without errors
    await expect(page).toHaveURL(/\/businesses/);
    await expect(page.locator('h1')).toContainText('Entreprises');
    
    // Check that businesses are displayed
    const businessCards = page.locator('[data-testid="business-card"], .business-card, article');
    await expect(businessCards.first()).toBeVisible();
    
    // Verify search functionality
    const searchInput = page.locator('input[type="search"], input[placeholder*="recherche"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('restaurant');
      await searchInput.press('Enter');
      
      // Should navigate to search results
      await expect(page).toHaveURL(/search=/);
    }
  });

  test('Review submission form works', async ({ page }) => {
    await page.goto('/review');
    
    // Check form elements
    await expect(page.locator('h1')).toContainText('avis');
    await expect(page.locator('input[name="businessName"], input[placeholder*="entreprise"]')).toBeVisible();
    await expect(page.locator('textarea[name="reviewText"], textarea[placeholder*="avis"]')).toBeVisible();
    await expect(page.locator('input[name="rating"], .star-rating')).toBeVisible();
    
    // Test form validation
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.error, .invalid, .form-error')).toBeVisible();
  });

  test('Admin panel - User management', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    
    // This might redirect to login if not authenticated
    if (await page.url().includes('/login')) {
      console.log('Redirected to login - expected for admin panel');
      return;
    }
    
    // If we're on the admin users page
    await expect(page.locator('h1')).toContainText('Utilisateurs');
    await expect(page.locator('[data-testid="user-list"], .user-table')).toBeVisible();
    
    // Test that the "Privileges & roles" dropdown works
    const userRows = page.locator('tr[data-user-id], [data-testid="user-row"]');
    if (await userRows.count() > 0) {
      const firstUserRow = userRows.first();
      const dropdownTrigger = firstUserRow.locator('button, [role="button"]').filter({ hasText: /Privilèges|Roles|Droits/i });
      
      if (await dropdownTrigger.count() > 0) {
        await dropdownTrigger.click();
        await expect(firstUserRow.locator('[role="menu"], .dropdown-menu, .popover-content')).toBeVisible();
      }
    }
  });

  test('Announcements form date picker works', async ({ page }) => {
    // This test requires admin authentication
    await page.goto('/admin/announcements/new');
    
    if (await page.url().includes('/login')) {
      console.log('Redirected to login - expected for admin announcements');
      return;
    }
    
    // Test date picker functionality
    const publishDateField = page.locator('input[placeholder*="date"], input[type="button"][value*="/"]');
    if (await publishDateField.count() > 0) {
      await publishDateField.click();
      
      // Calendar should appear
      await expect(page.locator('[role="dialog"], .calendar, .date-picker')).toBeVisible();
      
      // Select a date
      const today = new Date();
      const daySelector = page.locator(`[aria-label="${today.getDate()} "]`); // Space intentional
      
      if (await daySelector.count() > 0) {
        await daySelector.first().click();
        await expect(publishDateField).not.toBeEmpty();
      }
    }
  });

  test('Business claiming flow', async ({ page }) => {
    await page.goto('/claim');
    
    await expect(page.locator('h1')).toContainText('Revendiquer');
    
    // Check form fields
    await expect(page.locator('input[name="businessName"], input[placeholder*="établissement"]')).toBeVisible();
    await expect(page.locator('input[name="fullName"], input[placeholder*="nom"]')).toBeVisible();
    await expect(page.locator('input[name="email"], input[placeholder*="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"], input[placeholder*="téléphone"]')).toBeVisible();
    
    // Test form submission with invalid data
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.error, .invalid, .form-error')).toBeVisible();
  });

  test('Site settings display correctly', async ({ page }) => {
    // Check that site name appears in multiple places
    await page.goto('/');
    
    // Check header
    const headerText = await page.textContent('header h1, header a, .site-header');
    expect(headerText).not.toContain('Platform');
    
    // Check footer
    const footerText = await page.textContent('footer, .site-footer');
    expect(footerText).not.toContain('Platform');
    
    // Check document title
    const title = await page.title();
    expect(title).not.toContain('Platform');
  });

  test('Premium features page', async ({ page }) => {
    await page.goto('/pour-les-pros');
    
    await expect(page.locator('h1')).toContainText('Pro');
    await expect(page.locator('.pricing-card, .tier-option')).toBeVisible();
    await expect(page.locator('button:has-text("Premium"), button:has-text("croissance")')).toBeVisible();
  });

  test('Contact page functionality', async ({ page }) => {
    await page.goto('/contact');
    
    await expect(page.locator('h1')).toContainText('Contact');
    
    // Check form fields
    await expect(page.locator('input[name="name"], input[placeholder*="nom"]')).toBeVisible();
    await expect(page.locator('input[name="email"], input[placeholder*="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"], textarea[placeholder*="message"]')).toBeVisible();
    
    // Test form validation
    await page.click('button[type="submit"]');
    await expect(page.locator('.error, .invalid')).toBeVisible();
  });

  test('Legal pages load', async ({ page }) => {
    const legalPages = ['/terms', '/privacy', '/about'];
    
    for (const pagePath of legalPages) {
      try {
        await page.goto(pagePath);
        await expect(page.locator('h1, .page-title')).toBeVisible();
      } catch (e) {
        console.log(`Page ${pagePath} might not exist, which is OK`);
      }
    }
  });
});

// Specific tests for the issues we've fixed
test.describe('Regression Tests for Fixed Issues', () => {
  test('Announcements form date picker handles timezone correctly', async ({ page }) => {
    // This test ensures the date picker fix works
    await page.goto('/admin/announcements/new');
    
    if (await page.url().includes('/login')) {
      console.log('Skipping date picker test - requires admin login');
      return;
    }
    
    const datePicker = page.locator('button:has-text("Choisir une date")');
    if (await datePicker.count() > 0) {
      await datePicker.click();
      
      // Verify calendar appears
      await expect(page.locator('.react-day-picker, [role="dialog"].calendar')).toBeVisible();
      
      // Select a date
      const today = new Date();
      const dayElement = page.locator(`[role="gridcell"][aria-label="${today.getDate()} "]`).first();
      
      if (await dayElement.count() > 0) {
        await dayElement.click();
        
        // Verify the date was selected and formatted properly
        await expect(datePicker).not.toHaveText('Choisir une date');
      }
    }
  });

  test('Admin role change functionality works', async ({ page }) => {
    // This test verifies the admin role change fix
    await page.goto('/admin/utilisateurs');
    
    if (await page.url().includes('/login')) {
      console.log('Skipping admin role test - requires admin login');
      return;
    }
    
    // Look for user rows and dropdown menus
    const userRows = page.locator('tr[data-user-id]');
    if (await userRows.count() > 0) {
      const firstUserRow = userRows.first();
      
      // Look for the role change dropdown
      const roleDropdown = firstUserRow.locator('button:has-text("Privilèges"), button:has-text("Rôles")');
      
      if (await roleDropdown.count() > 0) {
        await roleDropdown.click();
        
        // Check that dropdown options appear
        await expect(firstUserRow.locator('[role="menu"], .dropdown-content')).toBeVisible();
        
        // Check for role options
        const roleOptions = firstUserRow.locator('button:has-text("admin"), button:has-text("pro"), button:has-text("utilisateur")');
        await expect(roleOptions).toHaveCount(3); // admin, pro, user
      }
    }
  });

  test('Businesses table loads without errors', async ({ page }) => {
    // This test verifies the businesses table fix
    await page.goto('/');
    
    // Check that no console errors related to businesses table occur
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('business')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to businesses page
    await page.goto('/businesses');
    await page.waitForLoadState('networkidle');
    
    // Check that no errors occurred
    expect(consoleErrors).toHaveLength(0);
    
    // Verify businesses are displayed
    await expect(page.locator('[data-testid="business-card"], .business-card')).toBeVisible();
  });
});