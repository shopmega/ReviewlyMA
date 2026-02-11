
import { test, expect } from '@playwright/test';

test.describe('Admin Monetization and Pro Features', () => {

    // Test 1: Admin Panel Configuration (th3mazze@gmail.com)
    test('Admin should see correct pricing and tier options', async ({ page }) => {
        // 1. Login
        await page.goto('/login');
        await page.locator('input[name="email"]').fill('th3mazze@gmail.com');
        await page.locator('input[name="password"]').fill('123456');
        await page.locator('button[type="submit"]').click();

        // Wait for redirect to admin or dashboard (admin usually redirects to /dashboard first, then needs to click Admin)
        // Or direct navigation if allowed
        await page.waitForURL(/\/dashboard|\/admin/, { timeout: 10000 });

        // Navigate to Settings
        await page.goto('/admin/parametres');

        // Click "Abonnements" tab
        await page.getByRole('tab', { name: 'Abonnements' }).click();

        // 2. Verify Pricing Fields
        await expect(page.locator('label:text("Growth Mensuel (MAD)")')).toBeVisible();
        await expect(page.locator('#tier_growth_monthly_price')).toHaveValue('99');

        await expect(page.locator('label:text("Pro Mensuel (MAD)")')).toBeVisible();
        await expect(page.locator('#tier_pro_monthly_price')).toHaveValue('299');

        // 3. Verify Payment Tier Options
        await page.goto('/admin/paiements');
        await page.getByRole('button', { name: /Ajouter/i }).first().click(); // Open modal

        // Check dropdown
        const tierSelect = page.locator('text=Sélectionner un plan');
        await tierSelect.click();
        await expect(page.locator('role=option[name="Business GROWTH"]')).toBeVisible();
        await expect(page.locator('role=option[name="Business PRO"]')).toBeVisible();
    });

    // Test 2: Pro User Experience (zouhairbenseddik@gmail.com)
    test('Pro user should see restricted fields and live buttons', async ({ page }) => {
        // 1. Login
        await page.goto('/login');
        await page.locator('input[name="email"]').fill('zouhairbenseddik@gmail.com');
        await page.locator('input[name="password"]').fill('123456');
        await page.locator('button[type="submit"]').click();

        await page.waitForURL(/\/dashboard/, { timeout: 10000 });

        // 2. Verify "Booster" Card or Status
        // Depending on UI, look for "Statut PRO" or similar
        // We'll skip strict text check if dynamic, but check for editing capabilities

        // 3. Go to Edit Profile
        await page.goto('/dashboard/edit-profile');

        // WhatsApp & Affiliate Inputs should be enabled (not disabled)
        // Assuming we have aria-labels or names. From previous code: name="whatsapp_number"
        const whatsappInput = page.locator('input[name="whatsapp_number"]');
        await expect(whatsappInput).toBeEnabled();

        const affiliateInput = page.locator('input[name="affiliate_link"]');
        await expect(affiliateInput).toBeEnabled();

        // 4. Set Values (if not set)
        await whatsappInput.fill('0600123456');
        await affiliateInput.fill('https://booking.com/hotel-test');
        await page.getByRole('button', { name: /Enregistrer/i }).click();

        // 5. Verify Public Page
        // Need to find the "Voir ma page" link or construct URL. 
        // Usually there is a link in dashboard sidebar or header.
        // For now we assume we can find it via "Voir mon établissement"
        await page.goto('/dashboard');
        const publicPageLink = await page.getByRole('link', { name: /Voir ma page/i }).getAttribute('href');
        if (publicPageLink) {
            await page.goto(publicPageLink);

            // Verify Buttons
            await expect(page.locator('a[href*="wa.me"]')).toBeVisible(); // WhatsApp
            await expect(page.locator('a[href*="booking.com"]')).toBeVisible(); // Affiliate

            // Verify NO Ads (Similar businesses) - Implementation dependent logic
            // e.g. await expect(page.locator('text=Établissements similaires')).not.toBeVisible();
        }
    });

});
