import { test, expect } from '@playwright/test';

test('Verify site name is not showing "Platform"', async ({ page }) => {
  // Test that the homepage loads and doesn't show "Platform"
  await page.goto('/');
  
  // Check the main heading/title
  const mainHeading = await page.textContent('h1, .site-title, .brand, nav a:first-child');
  console.log('Main heading text:', mainHeading);
  
  // Ensure we found a heading
  expect(mainHeading).not.toBeNull();
  
  // This should NOT contain "Platform"
  expect(mainHeading).not.toContain('Platform');
  
  // It should contain "Avis" or similar
  expect(mainHeading!.toLowerCase()).toContain('avis');
  
  // Check document title
  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);
  expect(pageTitle).not.toContain('Platform');
  
  // Check if there are any elements containing "Platform" (there shouldn't be)
  const platformElements = page.locator(':text("Platform")');
  const platformCount = await platformElements.count();
  console.log('Number of elements containing "Platform":', platformCount);
  expect(platformCount).toBe(0);
  
  console.log('✅ Site name fix verified - no "Platform" text found anywhere on the page');
});