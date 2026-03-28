/**
 * Test isolation and cleanup utilities
 * Ensures tests run in isolation and properly clean up after themselves
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { vi, beforeEach, afterEach } from 'vitest';

// Test isolation manager
export class TestIsolationManager {
  private static activeContexts: Set<BrowserContext> = new Set();
  private static activePages: Set<Page> = new Set();
  private static testData: Map<string, any> = new Map();
  private static cleanupTasks: Array<() => Promise<void>> = [];

  // Context management
  static async createIsolatedContext(browser: any): Promise<BrowserContext> {
    const isolatedContext = await browser.newContext({
      // Ensure complete isolation
      ignoreHTTPSErrors: true,
      acceptDownloads: false,
      bypassCSP: true,
    });

    this.activeContexts.add(isolatedContext);
    
    // Add cleanup for this context
    this.addCleanupTask(async () => {
      if (this.activeContexts.has(isolatedContext)) {
        await isolatedContext.close();
        this.activeContexts.delete(isolatedContext);
      }
    });

    return isolatedContext;
  }

  static async createIsolatedPage(context: BrowserContext): Promise<Page> {
    const page = await context.newPage();
    this.activePages.add(page);

    // Set up page isolation
    await page.addInitScript(() => {
      // Clear any existing storage
      window.localStorage.clear();
      window.sessionStorage.clear();
      
      // Clear any global state
      delete (window as any).__TEST_STATE__;
    });

    // Add cleanup for this page
    this.addCleanupTask(async () => {
      if (this.activePages.has(page)) {
        await page.close();
        this.activePages.delete(page);
      }
    });

    return page;
  }

  // Test data management
  static setTestData(key: string, data: any): void {
    this.testData.set(key, data);
  }

  static getTestData(key: string): any {
    return this.testData.get(key);
  }

  static clearTestData(): void {
    this.testData.clear();
  }

  // Cleanup task management
  static addCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  static async runCleanupTasks(): Promise<void> {
    const tasks = [...this.cleanupTasks];
    this.cleanupTasks = [];
    
    for (const task of tasks) {
      try {
        await task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    }
  }

  // Complete cleanup
  static async cleanupAll(): Promise<void> {
    await this.runCleanupTasks();
    
    // Close any remaining contexts and pages
    for (const context of this.activeContexts) {
      try {
        await context.close();
      } catch (error) {
        console.error('Failed to close context:', error);
      }
    }
    
    for (const page of this.activePages) {
      try {
        await page.close();
      } catch (error) {
        console.error('Failed to close page:', error);
      }
    }
    
    this.activeContexts.clear();
    this.activePages.clear();
    this.testData.clear();
  }
}

// Database cleanup utilities
export class DatabaseCleanupManager {
  private static createdRecords: Map<string, string[]> = new Map();

  static async recordCreatedRecord(entityType: string, id: string): Promise<void> {
    if (!this.createdRecords.has(entityType)) {
      this.createdRecords.set(entityType, []);
    }
    this.createdRecords.get(entityType)!.push(id);
  }

  static async cleanupCreatedRecords(): Promise<void> {
    // In a real implementation, this would make API calls to delete the records
    for (const [entityType, ids] of this.createdRecords) {
      console.log(`Cleaning up ${entityType} records:`, ids);
      // Example: await deleteRecords(entityType, ids);
    }
    this.createdRecords.clear();
  }

  static async cleanupTestData(): Promise<void> {
    // Clean up any test-specific data
    await this.cleanupCreatedRecords();
  }
}

// Mock cleanup utilities
export class MockCleanupManager {
  private static originalMocks: Map<string, any> = new Map();

  static async backupMock(moduleName: string, mockImplementation: any): Promise<void> {
    const original = require(moduleName);
    this.originalMocks.set(moduleName, original);
    vi.mock(moduleName, mockImplementation);
  }

  static async restoreAllMocks(): Promise<void> {
    for (const [moduleName, original] of this.originalMocks) {
      vi.unmock(moduleName);
      // Restore original implementation if needed
    }
    this.originalMocks.clear();
    vi.clearAllMocks();
  }
}

// Storage cleanup utilities
export class StorageCleanupManager {
  static async clearBrowserStorage(page: Page): Promise<void> {
    await page.evaluate(async () => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      
      // Clear IndexedDB
      if (window.indexedDB) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            await indexedDB.deleteDatabase(db.name);
          }
        }
      }
    });
  }

  static async clearCookies(context: BrowserContext): Promise<void> {
    await context.clearCookies();
  }

  static async clearCache(context: BrowserContext): Promise<void> {
    await context.clearPermissions();
  }
}

// Network cleanup utilities
export class NetworkCleanupManager {
  static async resetNetworkConditions(page: Page): Promise<void> {
    const context = page.context();
    await context.setOffline(false);
    await context.setGeolocation({ latitude: 0, longitude: 0 });
    await context.setHTTPCredentials(null);
  }

  static async clearNetworkInterceptions(page: Page): Promise<void> {
    // Clear any ongoing network interceptions
    await page.unroute('**/*');
  }
}

// Test lifecycle hooks
export const setupTestIsolation = () => {
  beforeEach(async () => {
    // Clear any existing test data
    TestIsolationManager.clearTestData();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Clear console
    console.clear();
  });

  afterEach(async () => {
    // Run cleanup tasks
    await TestIsolationManager.runCleanupTasks();
    
    // Clean up database records
    await DatabaseCleanupManager.cleanupTestData();
    
    // Restore mocks
    await MockCleanupManager.restoreAllMocks();
  });
};

// Global cleanup for test runs
process.on('exit', () => {
  TestIsolationManager.cleanupAll();
});

process.on('SIGINT', () => {
  TestIsolationManager.cleanupAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  TestIsolationManager.cleanupAll();
  process.exit(0);
});

// Export cleanup functions for manual use
export const cleanup = {
  all: TestIsolationManager.cleanupAll,
  database: DatabaseCleanupManager.cleanupTestData,
  mocks: MockCleanupManager.restoreAllMocks,
  storage: StorageCleanupManager.clearBrowserStorage,
  network: NetworkCleanupManager.resetNetworkConditions,
};

// Test data isolation utilities
export class TestDataIsolation {
  static async createIsolatedUserData(baseData: any): Promise<any> {
    return {
      ...baseData,
      id: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: `test-${Date.now()}@example.com`,
      created_at: new Date().toISOString(),
    };
  }

  static async createIsolatedBusinessData(baseData: any): Promise<any> {
    return {
      ...baseData,
      id: `test-business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      slug: `test-business-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
  }

  static async createIsolatedReviewData(baseData: any, businessId: string, userId: string): Promise<any> {
    return {
      ...baseData,
      id: `test-review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      business_id: businessId,
      user_id: userId,
      created_at: new Date().toISOString(),
    };
  }
}

// Error handling for cleanup failures
export class CleanupErrorHandler {
  static async handleCleanupError(error: Error, context: string): Promise<void> {
    console.error(`Cleanup error in ${context}:`, error);
    
    // Log error details
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
    
    // Continue with other cleanup tasks
    // Don't let one cleanup failure stop the entire process
  }
}

// Automatic cleanup runner
export class AutomaticCleanupRunner {
  private static isRunning = false;
  private static interval: NodeJS.Timeout | null = null;

  static start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.interval = setInterval(async () => {
      try {
        await TestIsolationManager.runCleanupTasks();
      } catch (error) {
        await CleanupErrorHandler.handleCleanupError(error as Error, 'automatic cleanup');
      }
    }, 30000); // Run every 30 seconds
  }

  static stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
  }
}
