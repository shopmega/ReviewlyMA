/**
 * Test utilities for common operations across the application
 * Provides helper functions for authentication, API testing, and browser interactions
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { 
  mockUsers, 
  mockBusinesses, 
  mockReviews, 
  mockAuthSessions,
  mockApiResponses 
} from '../fixtures/test-data';

// Authentication utilities
export class AuthUtils {
  static async loginAsUser(page: Page, userType: keyof typeof mockUsers) {
    const user = mockUsers[userType];
    const session = mockAuthSessions[`${userType}Session` as keyof typeof mockAuthSessions];
    
    // Set authentication cookies/tokens
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-access-token');
      window.localStorage.setItem('user_id', user.id);
      window.localStorage.setItem('user_role', user.role);
    });
    
    // Alternatively, navigate to login and fill form
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', user.email);
    await page.fill('input[name="password"], input[type="password"]', 'ValidPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard or profile
    await expect(page).toHaveURL(/\/(dashboard|profile)/);
  }

  static async logout(page: Page) {
    await page.click('[data-testid="user-menu"], [aria-label="User menu"]');
    await page.click('text=Logout, text=Déconnexion');
    await expect(page).toHaveURL('/login');
  }

  static async verifyAuthState(page: Page, expectedRole: string) {
    const userRole = await page.evaluate(() => 
      window.localStorage.getItem('user_role')
    );
    expect(userRole).toBe(expectedRole);
  }
}

// Navigation utilities
export class NavigationUtils {
  static async navigateToBusiness(page: Page, businessSlug: string) {
    await page.goto(`/businesses/${businessSlug}`);
    await expect(page).toHaveURL(`/businesses/${businessSlug}`);
    await expect(page.locator('h1')).toBeVisible();
  }

  static async navigateToDashboard(page: Page) {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  }

  static async navigateToAdmin(page: Page) {
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
  }

  static async searchForBusiness(page: Page, searchTerm: string, city?: string) {
    await page.goto('/businesses');
    await page.fill('input[placeholder*="search"], input[placeholder*="recherche"]', searchTerm);
    if (city) {
      await page.fill('input[placeholder*="city"], input[placeholder*="ville"]', city);
    }
    await page.click('button[type="submit"], button:has-text("Search")');
    await page.waitForLoadState('networkidle');
  }
}

// Business interaction utilities
export class BusinessUtils {
  static async clickWriteReview(page: Page) {
    await page.click('text=Write a Review, text="Écrire un avis"');
    await expect(page).toHaveURL(/\/review/);
  }

  static async fillReviewForm(page: Page, reviewData: Partial<typeof mockReviews.positiveReview>) {
    // Rating
    if (reviewData.rating) {
      const stars = page.locator('[data-testid="rating-star"]');
      await stars.nth(reviewData.rating - 1).click();
    }

    // Title
    if (reviewData.title) {
      await page.fill('input[name="title"], input[placeholder*="title"]', reviewData.title);
    }

    // Content
    if (reviewData.content) {
      await page.fill('textarea[name="content"], textarea[placeholder*="review"]', reviewData.content);
    }

    // Pros
    if (reviewData.pros) {
      await page.fill('textarea[name="pros"], textarea[placeholder*="pros"]', reviewData.pros);
    }

    // Cons
    if (reviewData.cons) {
      await page.fill('textarea[name="cons"], textarea[placeholder*="cons"]', reviewData.cons);
    }

    // Would recommend
    if (reviewData.would_recommend !== undefined) {
      const recommendCheckbox = page.locator('input[name="would_recommend"]');
      if (reviewData.would_recommend !== await recommendCheckbox.isChecked()) {
        await recommendCheckbox.click();
      }
    }
  }

  static async submitReview(page: Page) {
    await page.click('button[type="submit"]:has-text("Submit"), button:has-text("Soumettre")');
    await page.waitForLoadState('networkidle');
  }

  static async claimBusiness(page: Page) {
    await page.click('text=Claim this business, text="Réclamer cette entreprise"');
    await expect(page).toHaveURL(/\/claim/);
  }
}

// Admin utilities
export class AdminUtils {
  static async navigateToUsers(page: Page) {
    await page.goto('/admin/utilisateurs');
    await expect(page).toHaveURL('/admin/utilisateurs');
  }

  static async navigateToBusinesses(page: Page) {
    await page.goto('/admin/etablissements');
    await expect(page).toHaveURL('/admin/etablissements');
  }

  static async searchUser(page: Page, email: string) {
    await page.fill('input[placeholder*="email"], input[placeholder*="search"]', email);
    await page.click('button:has-text("Search"), button:has-text("Rechercher")');
    await page.waitForLoadState('networkidle');
  }

  static async verifyBusiness(page: Page, businessId: string) {
    await page.click(`button[data-business-id="${businessId}"][data-action="verify"]`);
    await expect(page.locator('text=Business verified, text="Entreprise vérifiée"')).toBeVisible();
  }

  static async suspendUser(page: Page, userId: string) {
    await page.click(`button[data-user-id="${userId}"][data-action="suspend"]`);
    await expect(page.locator('text=User suspended, text="Utilisateur suspendu"')).toBeVisible();
  }
}

// Form utilities
export class FormUtils {
  static async fillForm(page: Page, formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = page.locator(`input[name="${field}"], textarea[name="${field}"], select[name="${field}"]`);
      await input.fill(value);
    }
  }

  static async submitForm(page: Page, buttonSelector?: string) {
    const selector = buttonSelector || 'button[type="submit"]';
    await page.click(selector);
    await page.waitForLoadState('networkidle');
  }

  static async waitForSuccessMessage(page: Page) {
    await expect(page.locator('[data-testid="success-message"], .alert-success')).toBeVisible();
  }

  static async waitForErrorMessage(page: Page) {
    await expect(page.locator('[data-testid="error-message"], .alert-error')).toBeVisible();
  }
}

// API testing utilities
export class ApiUtils {
  static async makeApiRequest(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  }

  static async expectApiSuccess(response: { status: number; data: any }) {
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
  }

  static async expectApiError(response: { status: number; data: any }, expectedStatus: number = 400) {
    expect(response.status).toBe(expectedStatus);
    expect(response.data.status).toBe('error');
  }
}

// Performance utilities
export class PerformanceUtils {
  static async measurePageLoad(page: Page, url: string) {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    return {
      url,
      loadTime,
      timestamp: new Date().toISOString(),
    };
  }

  static async measureInteraction(page: Page, action: () => Promise<void>) {
    const startTime = Date.now();
    await action();
    const duration = Date.now() - startTime;
    
    return {
      duration,
      timestamp: new Date().toISOString(),
    };
  }
}

// Accessibility utilities
export class AccessibilityUtils {
  static async checkAccessibility(page: Page) {
    // Basic accessibility checks
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main, [role="main"]')).toBeVisible();
    
    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const image of images) {
      const alt = await image.getAttribute('alt');
      expect(alt).toBeDefined();
    }
    
    // Check form labels
    const inputs = await page.locator('input, textarea, select').all();
    for (const input of inputs) {
      const hasLabel = await input.locator('xpath=./ancestor::label | ./preceding-sibling::label | ./following-sibling::label').count();
      const hasAriaLabel = await input.getAttribute('aria-label');
      expect(hasLabel > 0 || hasAriaLabel).toBeTruthy();
    }
  }
}

// Data validation utilities
export class ValidationUtils {
  static async validateBusinessCard(page: Page, expectedBusiness: typeof mockBusinesses.cafeRabat) {
    await expect(page.locator('h1')).toContainText(expectedBusiness.name);
    await expect(page.locator('[data-testid="business-rating"]')).toContainText(expectedBusiness.rating.toString());
    await expect(page.locator('[data-testid="business-category"]')).toContainText(expectedBusiness.category);
    await expect(page.locator('[data-testid="business-city"]')).toContainText(expectedBusiness.city);
  }

  static async validateReviewCard(page: Page, expectedReview: typeof mockReviews.positiveReview) {
    await expect(page.locator('[data-testid="review-rating"]')).toContainText(expectedReview.rating.toString());
    await expect(page.locator('[data-testid="review-title"]')).toContainText(expectedReview.title);
    await expect(page.locator('[data-testid="review-content"]')).toContainText(expectedReview.content);
  }

  static async validateUserDashboard(page: Page, user: typeof mockUsers.regularUser) {
    await expect(page.locator('[data-testid="user-name"]')).toContainText(user.full_name);
    await expect(page.locator('[data-testid="user-email"]')).toContainText(user.email);
  }
}

// Test setup utilities
export class TestSetupUtils {
  static async setupTestData() {
    // This would typically make API calls to set up test data
    // For now, return mock data
    return {
      users: mockUsers,
      businesses: mockBusinesses,
      reviews: mockReviews,
    };
  }

  static async cleanupTestData() {
    // This would typically clean up test data from the database
    console.log('Test data cleanup completed');
  }

  static async createTestContext(context: BrowserContext) {
    // Set up common context for tests
    await context.addInitScript(() => {
      // Mock any global APIs or set up test environment
      (window as Window & { __TEST_ENV__?: boolean }).__TEST_ENV__ = true;
    });
    
    return context;
  }
}

// Custom matchers and assertions
export const customMatchers = {
  async toBeAccessible(page: Page) {
    try {
      await AccessibilityUtils.checkAccessibility(page);
      return { pass: true, message: () => 'Page is accessible' };
    } catch (error) {
      return { pass: false, message: () => `Page is not accessible: ${error}` };
    }
  },

  async toHaveValidBusinessCard(page: Page, expectedBusiness: typeof mockBusinesses.cafeRabat) {
    try {
      await ValidationUtils.validateBusinessCard(page, expectedBusiness);
      return { pass: true, message: () => 'Business card is valid' };
    } catch (error) {
      return { pass: false, message: () => `Business card is invalid: ${error}` };
    }
  },
};

// Extend expect with custom matchers
expect.extend(customMatchers as any);
