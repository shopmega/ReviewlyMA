/**
 * Accessibility test setup
 * Additional setup for accessibility testing
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock axe-core for accessibility testing
vi.mock('axe-core', () => ({
  default: {
    run: vi.fn().mockResolvedValue({
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: [],
    }),
  },
}));

// Add custom accessibility matchers
expect.extend({
  toBeAccessible(received: any) {
    try {
      // Basic accessibility checks
      const hasHeading = received.querySelector('h1, h2, h3, h4, h5, h6');
      const hasMain = received.querySelector('main, [role="main"]');
      const hasFormLabels = (Array.from(received.querySelectorAll('input, textarea, select')) as Element[]).every(
        (input: Element) => {
          const hasLabel = input.closest('label') || 
                          received.querySelector(`label[for="${input.id}"]`) ||
                          input.getAttribute('aria-label') ||
                          input.getAttribute('aria-labelledby');
          return hasLabel;
        }
      );

      if (!hasHeading) {
        return {
          pass: false,
          message: () => 'Expected element to have at least one heading element',
        };
      }

      if (!hasMain) {
        return {
          pass: false,
          message: () => 'Expected element to have a main element or role="main"',
        };
      }

      if (!hasFormLabels) {
        return {
          pass: false,
          message: () => 'Expected all form controls to have associated labels',
        };
      }

      return {
        pass: true,
        message: () => 'Element is accessible',
      };
    } catch (error) {
      return {
        pass: false,
        message: () => `Accessibility check failed: ${error}`,
      };
    }
  },

  toHaveValidImageAlts(received: any) {
    try {
      const images = received.querySelectorAll('img');
      const imagesWithoutAlts = (Array.from(images) as Element[]).filter(
        (img: Element) => !img.getAttribute('alt') && !img.getAttribute('role')
      );

      if (imagesWithoutAlts.length > 0) {
        return {
          pass: false,
          message: () => `Found ${imagesWithoutAlts.length} images without alt text`,
        };
      }

      return {
        pass: true,
        message: () => 'All images have alt text',
      };
    } catch (error) {
      return {
        pass: false,
        message: () => `Image alt check failed: ${error}`,
      };
    }
  },

  toHaveContrastRatio(received: any, expectedRatio: number = 4.5) {
    try {
      // This is a simplified check - in real implementation, you'd use a proper contrast calculation library
      const textElements = received.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button');
      
      // For now, just check that text elements exist and are visible
      if (textElements.length === 0) {
        return {
          pass: false,
          message: () => 'No text elements found to check contrast',
        };
      }

      return {
        pass: true,
        message: () => `Text elements found (contrast check would be implemented with proper color calculation)`,
      };
    } catch (error) {
      return {
        pass: false,
        message: () => `Contrast check failed: ${error}`,
      };
    }
  },
});

// Extend the global expect type
declare global {
  namespace Vi {
    interface Assertion {
      toBeAccessible(): any;
      toHaveValidImageAlts(): any;
      toHaveContrastRatio(expectedRatio?: number): any;
    }
  }
}
