
import { getPublicClient } from './client';
import { getFromEmail, getSiteName } from '@/lib/site-config';

export type SiteSettings = {
    site_name: string;
    site_description: string;
    contact_email: string;
    support_phone?: string;
    facebook_url?: string;
    twitter_url?: string;
    instagram_url?: string;
    linkedin_url?: string;
    maintenance_mode: boolean;
    allow_new_registrations: boolean;
    require_email_verification: boolean;
    default_language: string;
    enable_reviews: boolean;
    enable_salaries: boolean;
    enable_interviews: boolean;
    enable_messaging: boolean;
    enable_claims: boolean;
    premium_annual_price: number;
    premium_monthly_price: number;
    tier_growth_monthly_price: number;
    tier_growth_annual_price: number;
    tier_gold_monthly_price: number;
    tier_gold_annual_price: number;
    premium_enabled: boolean;
    premium_description: string;
    site_logo_url?: string;
    google_analytics_id?: string;
    facebook_pixel_id?: string;
    adsense_enabled?: boolean;
    adsense_client_id?: string;
    adsense_auto_ads_enabled?: boolean;
    office_address?: string;
    office_phone?: string;
    copyright_text?: string;
    home_sections_config?: { id: string; visible: boolean }[];
    popular_searches_config?: { label: string; href: string }[];
    email_provider?: string;
    resend_api_key?: string;
    sendgrid_api_key?: string;
    mailjet_api_key?: string;
    mailjet_api_secret?: string;
    email_from?: string;

    // Payment settings
    payment_bank_name?: string;
    payment_rib_number?: string;
    payment_beneficiary?: string;
    payment_chari_url?: string;
    payment_methods_enabled?: string[];
};

export const getDefaultSettings = (): SiteSettings => ({
    site_name: 'Platform',
    site_description: 'Trouvez des avis sur les établissements, les services et les produits.',
    contact_email: 'contact@example.com',
    maintenance_mode: false,
    allow_new_registrations: true,
    require_email_verification: true,
    default_language: 'fr',
    enable_reviews: true,
    enable_salaries: true,
    enable_interviews: true,
    enable_messaging: false,
    enable_claims: true,
    premium_annual_price: 500.00,
    premium_monthly_price: 50.00,
    tier_growth_monthly_price: 99.00,
    tier_growth_annual_price: 990.00,
    tier_gold_monthly_price: 299.00,
    tier_gold_annual_price: 2900.00,
    premium_enabled: true,
    premium_description: 'Devenez membre Premium et bénéficiez de fonctionnalités exclusives pour propulser votre établissement.',
    site_logo_url: undefined,
    google_analytics_id: undefined,
    facebook_pixel_id: undefined,
    adsense_enabled: false,
    adsense_client_id: undefined,
    adsense_auto_ads_enabled: false,
    office_address: 'Casablanca, Morocco',
    office_phone: undefined,
    copyright_text: `&copy; ${new Date().getFullYear()} Platform. Designé avec excellence à Casablanca.`,
    home_sections_config: [
        { id: 'hero', visible: true },
        { id: 'stats', visible: true },
        { id: 'collections', visible: true },
        { id: 'categories', visible: true },
        { id: 'cities', visible: true },
        { id: 'featured', visible: true },
    ],
    popular_searches_config: [
        { label: 'Restaurants à Casablanca', href: '/businesses?search=Restaurant&city=Casablanca' },
        { label: 'Salons de coiffure', href: '/businesses?search=Coiffure' },
        { label: 'Hôtels à Rabat', href: '/businesses?category=Hôtels&city=Rabat' }
    ],
    email_provider: 'console',
    resend_api_key: '',
    sendgrid_api_key: '',
    mailjet_api_key: '',
    mailjet_api_secret: '',
    email_from: getFromEmail(),

    // Default payment settings
    payment_bank_name: 'BMCE Bank',
    payment_rib_number: '011 780 0000 1234567890 12 34',
    payment_beneficiary: `${getSiteName()} SARL`,
    payment_chari_url: 'https://chari.ma/avis',
    payment_methods_enabled: ['bank_transfer'],
});

export const getSiteSettings = async (): Promise<SiteSettings> => {
    try {
        const supabase = getPublicClient();

        // Site settings are critical, fetch with retry logic and longer timeout
        const maxRetries = 2;
        let lastError: any = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const fetchPromise = supabase
                    .from('site_settings')
                    .select('*')
                    .eq('id', 'main')
                    .maybeSingle();

                // Increased timeout to 10 seconds for slow connections
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 10000)
                );

                const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
                const { data, error } = result;

                if (error) {
                    lastError = error;
                    // Retry on network errors, but not on not found
                    if (error.code === 'PGRST116' || attempt === maxRetries) {
                        break;
                    }
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }

                if (!data) {
                    // No data found, use defaults
                    return getDefaultSettings();
                }

                // Success - return the data
                return {
                    ...data,
                    tier_gold_monthly_price: data.tier_gold_monthly_price || data.tier_pro_monthly_price || 299.00,
                    tier_gold_annual_price: data.tier_gold_annual_price || data.tier_pro_annual_price || 2900.00,
                    enable_reviews: data.enable_reviews ?? true,
                    enable_salaries: data.enable_salaries ?? true,
                    enable_interviews: data.enable_interviews ?? true,
                    enable_messaging: data.enable_messaging ?? false,
                    enable_claims: data.enable_claims ?? true,
                    site_logo_url: data.site_logo_url || null,
                    google_analytics_id: data.google_analytics_id || null,
                    facebook_pixel_id: data.facebook_pixel_id || null,
                    adsense_enabled: data.adsense_enabled ?? false,
                    adsense_client_id: data.adsense_client_id || null,
                    adsense_auto_ads_enabled: data.adsense_auto_ads_enabled ?? false,
                    office_address: data.office_address || 'Casablanca, Morocco',
                    office_phone: data.office_phone || data.support_phone || null,
                    copyright_text: data.copyright_text || `&copy; ${new Date().getFullYear()} {site_name}. Designé avec excellence à Casablanca.`,
                    home_sections_config: data.home_sections_config || [
                        { id: 'hero', visible: true },
                        { id: 'stats', visible: true },
                        { id: 'collections', visible: true },
                        { id: 'categories', visible: true },
                        { id: 'cities', visible: true },
                        { id: 'featured', visible: true },
                    ],
                    popular_searches_config: data.popular_searches_config || [
                        { label: 'Restaurants à Casablanca', href: '/businesses?search=Restaurant&city=Casablanca' },
                        { label: 'Salons de coiffure', href: '/businesses?search=Coiffure' },
                        { label: 'Hôtels à Rabat', href: '/businesses?category=Hôtels&city=Rabat' }
                    ],
                    email_provider: data.email_provider || 'console',
                    resend_api_key: data.resend_api_key || '',
                    sendgrid_api_key: data.sendgrid_api_key || '',
                    mailjet_api_key: data.mailjet_api_key || '',
                    mailjet_api_secret: data.mailjet_api_secret || '',
                    email_from: data.email_from || getFromEmail(),

                    // Payment settings defaults if missing
                    payment_bank_name: data.payment_bank_name || 'BMCE Bank',
                    payment_rib_number: data.payment_rib_number || '011 780 0000 1234567890 12 34',
                    payment_beneficiary: data.payment_beneficiary || `${getSiteName(data)} SARL`,
                    payment_chari_url: data.payment_chari_url || 'https://chari.ma/avis',
                    payment_methods_enabled: data.payment_methods_enabled || ['bank_transfer'],
                };
            } catch (err: any) {
                lastError = err;
                // If it's a timeout and we have retries left, continue
                if (err?.message?.includes('timeout') && attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }
                // Otherwise break and fall through to default
                break;
            }
        }

        // All retries failed, log and return defaults
        if (lastError) {
            const errorMsg = lastError?.message || String(lastError);
            const errorCode = lastError?.code || 'UNKNOWN';
            // Use logger if available, otherwise console
            if (typeof console !== 'undefined' && console.warn) {
                console.warn(`getSiteSettings: failed after ${maxRetries + 1} attempts, using defaults. Error: ${errorMsg} (Code: ${errorCode})`);
            }
        } else {
            // No data found
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('getSiteSettings: no data found for id "main", using defaults.');
            }
        }

        return getDefaultSettings();
    } catch (err: any) {
        // Final catch-all for unexpected errors
        const errorMsg = err?.message || String(err);
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('getSiteSettings: unexpected error, using defaults.', errorMsg);
        }
        return getDefaultSettings();
    }
};
