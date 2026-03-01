import { test, expect } from '@playwright/test';

test.describe('RSC Navigation Integrity', () => {
  test('client navigation does not trigger RSC fallback errors', async ({ page }) => {
    const rscResponses: Array<{
      url: string;
      status: number;
      contentType: string;
    }> = [];
    const rscFailures: string[] = [];
    const consoleFailures: string[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      const req = response.request();
      const reqHeaders = req.headers();
      const accept = (reqHeaders['accept'] || '').toLowerCase();
      const hasRscSignal =
        url.includes('_rsc=') ||
        !!reqHeaders['rsc'] ||
        !!reqHeaders['next-router-state-tree'] ||
        accept.includes('text/x-component');

      if (!hasRscSignal) return;

      const status = response.status();
      const contentType = (response.headers()['content-type'] || '').toLowerCase();
      rscResponses.push({ url, status, contentType });

      if (status >= 400) {
        rscFailures.push(`status ${status} for ${url}`);
        return;
      }

      if (contentType.includes('text/html')) {
        rscFailures.push(`html payload for ${url}`);
      }
    });

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (
        text.includes('Failed to fetch RSC payload') ||
        text.includes('falling back to browser navigation') ||
        text.includes('e.includes is not a function')
      ) {
        consoleFailures.push(text);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    const routes = ['/businesses', '/salaires', '/categories', '/villes'];
    for (const route of routes) {
      await page.locator(`a[href="${route}"]`).first().click();
      await page.waitForURL(new RegExp(`${route.replace('/', '\\/')}`), { timeout: 15000 });
      await page.waitForLoadState('networkidle');
    }

    expect(consoleFailures, `RSC console errors:\n${consoleFailures.join('\n')}`).toEqual([]);
    expect(rscFailures, `RSC network failures:\n${rscFailures.join('\n')}`).toEqual([]);
  });
});
