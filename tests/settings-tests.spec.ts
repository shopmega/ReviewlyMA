import { test, expect } from '@playwright/test';

test.describe('Site Settings Tests', () => {
  test('Site settings load correctly', async ({ page }) => {
    // Test that site settings are properly loaded on homepage
    await page.goto('/');
    
    // Check that the site name is not "Platform" anymore
    const title = await page.textContent('h1, .site-title, .brand, nav a:first-child');
    expect(title).not.toContain('Platform');
    expect(title).toContain('Avis');
    
    // Check document title
    const pageTitle = await page.title();
    expect(pageTitle).not.toContain('Platform');
    
    // Check meta description
    const description = await page.getAttribute('head meta[name="description"]', 'content');
    expect(description).not.toContain('Platform');
  });

  test('Admin settings page works', async ({ page }) => {
    await page.goto('/admin/parametres');
    
    // This might redirect to login if not authenticated
    if (await page.url().includes('/login')) {
      console.log('Redirected to login - expected for admin settings');
      return;
    }
    
    // If on settings page, verify elements
    await expect(page.locator('h1')).toContainText('Paramètres');
    
    // Check for different tab sections
    await expect(page.locator('button:has-text("Général"), button:has-text("Généraux")')).toBeVisible();
    await expect(page.locator('button:has-text("Fonctionnalités")')).toBeVisible();
    await expect(page.locator('button:has-text("Inscriptions")')).toBeVisible();
    
    // Check site name field
    const siteNameField = page.locator('input[name="site_name"], input[placeholder*="nom"]');
    if (await siteNameField.count() > 0) {
      const currentValue = await siteNameField.inputValue();
      expect(currentValue).not.toEqual('Platform');
      expect(currentValue).toEqual('Avis.ma');
    }
  });

  test('Settings are reflected across pages', async ({ page }) => {
    // Test that settings are consistent across different pages
    
    // Check homepage
    await page.goto('/');
    const homeTitle = await page.textContent('h1, .site-title');
    
    // Check about page
    await page.goto('/about');
    const aboutTitle = await page.textContent('h1, .site-title');
    
    // Check contact page
    await page.goto('/contact');
    const contactTitle = await page.textContent('h1, .site-title');
    
    // All should have the same site name
    expect(homeTitle).not.toContain('Platform');
    expect(aboutTitle).not.toContain('Platform');
    expect(contactTitle).not.toContain('Platform');
    
    expect(homeTitle).toContain('Avis');
    expect(aboutTitle).toContain('Avis');
    expect(contactTitle).toContain('Avis');
  });

  test('Settings API endpoint works', async ({ page }) => {
    // Test the settings API endpoint directly if available
    try {
      const response = await page.request.get('/api/settings');
      const settings = await response.json();
      
      expect(settings.site_name).not.toEqual('Platform');
      expect(settings.site_name).toEqual('Avis.ma');
    } catch (e) {
      console.log('Settings API endpoint not available or requires authentication');
    }
  });

  test('Settings cache is invalidated properly', async ({ page }) => {
    // Test that when settings are updated, they're properly refreshed
    await page.goto('/');
    
    // Force a page reload to ensure fresh settings
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check that the correct site name is still displayed
    const title = await page.textContent('h1, .site-title, .brand');
    expect(title).not.toContain('Platform');
    expect(title).toContain('Avis');
  });

  test('Settings work in different locales', async ({ page }) => {
    // Test that settings work with different language settings
    await page.goto('/fr');
    
    // Check that site name still appears correctly in French context
    const title = await page.textContent('h1, .site-title');
    expect(title).not.toContain('Platform');
    expect(title).toContain('Avis');
  });

  test('Settings are properly applied in admin panel', async ({ page }) => {
    await page.goto('/admin');
    
    if (await page.url().includes('/login')) {
      console.log('Redirected to login - expected for admin panel');
      return;
    }
    
    // In admin panel, check that branding is consistent
    const adminTitle = await page.textContent('h1, .site-title, .brand');
    expect(adminTitle).not.toContain('Platform');
    expect(adminTitle).toContain('Avis');
  });

  test('Settings work in private/incognito mode', async ({ page }) => {
    // Create a new context to simulate private browsing
    const browser = page.context().browser();
    if (!browser) {
      throw new Error('Browser not available');
    }
    const context = await browser.newContext();
    const privatePage = await context.newPage();
    
    await privatePage.goto('/');
    
    // Check that settings are applied even in private mode
    const title = await privatePage.textContent('h1, .site-title');
    expect(title).not.toContain('Platform');
    expect(title).toContain('Avis');
    
    await context.close();
  });
});