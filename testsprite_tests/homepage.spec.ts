import { test, expect } from '@playwright/test';

test.describe('TestSprite E2E Tests', () => {
  test('Homepage Load Test', async ({ page }) => {
    // Test if the homepage loads correctly
    await page.goto('http://localhost:9002/');
    
    // Wait for the body element to be loaded
    await page.waitForSelector('body');
    
    // Verify the page loaded successfully
    await expect(page.locator('body')).toBeVisible();
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/homepage-load-test.png' });
  });
});
