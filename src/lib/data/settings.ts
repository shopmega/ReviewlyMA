import { getPublicClient } from './client';
import { getFromEmail, getSiteName } from '@/lib/site-config';

export type SiteSettings = {
    id?: string;
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
    google_analytics_id?: string | null;
    facebook_pixel_id?: string | null;
    adsense_enabled?: boolean;
    adsense_client_id?: string | null;
    adsense_auto_ads_enabled?: boolean;
    office_address?: string;
    office_phone?: string | null;
    copyright_text?: string;
    home_sections_config?: { id: string; visible: boolean }[];
    popular_searches_config?: { label: string; href: string }[];
    email_provider?: string;
    resend_api_key?: string;
    sendgrid_api_key?: string;
    mailjet_api_key?: string;
    mailjet_api_secret?: string;
    email_from?: string;
    payment_bank_name?: string;
    payment_rib_number?: string;
    payment_beneficiary?: string;
    payment_chari_url?: string;
    payment_methods_enabled?: string[];
    partner_app_name?: string;
    partner_app_url?: string;
    salary_roles?: string[];
    salary_departments?: string[];
    salary_intervals?: Array<{
        id: string;
        label: string;
        min: number;
        max: number;
    }>;
};

export const getDefaultSettings = (): SiteSettings => ({
    id: 'main',
    site_name: 'Reviewly',
    site_description: "Trouvez des avis sur les employeurs, les salaires et la culture d'entreprise.",
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
    premium_annual_price: 500.0,
    premium_monthly_price: 50.0,
    tier_growth_monthly_price: 99.0,
    tier_growth_annual_price: 990.0,
    tier_gold_monthly_price: 299.0,
    tier_gold_annual_price: 2900.0,
    premium_enabled: true,
    premium_description: 'Devenez membre Premium et beneficiez de fonctionnalites exclusives pour propulser votre etablissement.',
    site_logo_url: '/app-logo.png',
    google_analytics_id: null,
    facebook_pixel_id: null,
    adsense_enabled: false,
    adsense_client_id: null,
    adsense_auto_ads_enabled: false,
    office_address: 'Casablanca, Morocco',
    office_phone: null,
    copyright_text: `&copy; ${new Date().getFullYear()} Reviewly. Designed with care in Casablanca.`,
    home_sections_config: [
        { id: 'hero', visible: true },
        { id: 'stats', visible: true },
        { id: 'collections', visible: true },
        { id: 'categories', visible: true },
        { id: 'cities', visible: true },
        { id: 'featured', visible: true },
    ],
    popular_searches_config: [
        { label: 'Tech a Casablanca', href: '/businesses?search=Tech&city=Casablanca' },
        { label: 'Banques a Rabat', href: '/businesses?category=Finance&city=Rabat' },
        { label: 'Offshoring a Tanger', href: '/businesses?category=Offshoring&city=Tanger' },
    ],
    email_provider: 'console',
    resend_api_key: '',
    sendgrid_api_key: '',
    mailjet_api_key: '',
    mailjet_api_secret: '',
    email_from: getFromEmail(),
    payment_bank_name: 'BMCE Bank',
    payment_rib_number: '011 780 0000 1234567890 12 34',
    payment_beneficiary: `${getSiteName()} SARL`,
    payment_chari_url: 'https://chari.ma/avis',
    payment_methods_enabled: ['bank_transfer'],
    partner_app_name: 'MOR RH',
    partner_app_url: 'https://monrh.vercel.app/',
    salary_roles: [
        'Ingenieur logiciel',
        'Ingenieur logiciel senior',
        'Lead technique',
        'Manager ingenierie',
        'Chef de produit',
        'Analyste data',
        'Data scientist',
        'Designer UX',
        'Designer UI',
        'Ingenieur QA',
        'Ingenieur DevOps',
        'Specialiste RH',
        'Specialiste marketing',
        'Representant commercial',
        'Support client',
    ],
    salary_departments: [
        'Ingenierie',
        'Produit',
        'Design',
        'Data',
        'Operations',
        'Ressources humaines',
        'Marketing',
        'Commercial',
        'Finance',
        'Juridique',
        'Support client',
    ],
    salary_intervals: [
        { id: 'lt_3000', label: 'Moins de 3 000 MAD', min: 500, max: 2999 },
        { id: '3000_4999', label: '3 000 - 4 999 MAD', min: 3000, max: 4999 },
        { id: '5000_7999', label: '5 000 - 7 999 MAD', min: 5000, max: 7999 },
        { id: '8000_11999', label: '8 000 - 11 999 MAD', min: 8000, max: 11999 },
        { id: '12000_19999', label: '12 000 - 19 999 MAD', min: 12000, max: 19999 },
        { id: '20000_29999', label: '20 000 - 29 999 MAD', min: 20000, max: 29999 },
        { id: '30000_plus', label: '30 000+ MAD', min: 30000, max: 10000000 },
    ],
});

export const normalizeSiteSettings = (data?: Partial<SiteSettings> | null): SiteSettings => {
    const defaults = getDefaultSettings();

    if (!data) {
        return defaults;
    }

    return {
        ...defaults,
        ...data,
        id: data.id || defaults.id,
        tier_gold_monthly_price: data.tier_gold_monthly_price || (data as any).tier_pro_monthly_price || defaults.tier_gold_monthly_price,
        tier_gold_annual_price: data.tier_gold_annual_price || (data as any).tier_pro_annual_price || defaults.tier_gold_annual_price,
        enable_reviews: data.enable_reviews ?? defaults.enable_reviews,
        enable_salaries: data.enable_salaries ?? defaults.enable_salaries,
        enable_interviews: data.enable_interviews ?? defaults.enable_interviews,
        enable_messaging: data.enable_messaging ?? defaults.enable_messaging,
        enable_claims: data.enable_claims ?? defaults.enable_claims,
        site_logo_url: data.site_logo_url || defaults.site_logo_url,
        google_analytics_id: data.google_analytics_id || null,
        facebook_pixel_id: data.facebook_pixel_id || null,
        adsense_enabled: data.adsense_enabled ?? defaults.adsense_enabled,
        adsense_client_id: data.adsense_client_id || null,
        adsense_auto_ads_enabled: data.adsense_auto_ads_enabled ?? defaults.adsense_auto_ads_enabled,
        office_address: data.office_address || defaults.office_address,
        office_phone: data.office_phone || data.support_phone || null,
        copyright_text: data.copyright_text || defaults.copyright_text,
        home_sections_config: data.home_sections_config || defaults.home_sections_config,
        popular_searches_config: data.popular_searches_config || defaults.popular_searches_config,
        email_provider: data.email_provider || defaults.email_provider,
        resend_api_key: data.resend_api_key || '',
        sendgrid_api_key: data.sendgrid_api_key || '',
        mailjet_api_key: data.mailjet_api_key || '',
        mailjet_api_secret: data.mailjet_api_secret || '',
        email_from: data.email_from || getFromEmail(data),
        payment_bank_name: data.payment_bank_name || defaults.payment_bank_name,
        payment_rib_number: data.payment_rib_number || defaults.payment_rib_number,
        payment_beneficiary: data.payment_beneficiary || `${getSiteName(data)} SARL`,
        payment_chari_url: data.payment_chari_url || defaults.payment_chari_url,
        payment_methods_enabled: data.payment_methods_enabled || defaults.payment_methods_enabled,
        partner_app_name: data.partner_app_name || defaults.partner_app_name,
        partner_app_url: data.partner_app_url || defaults.partner_app_url,
        salary_roles: data.salary_roles || defaults.salary_roles,
        salary_departments: data.salary_departments || defaults.salary_departments,
        salary_intervals: data.salary_intervals || defaults.salary_intervals,
    };
};

export const getSiteSettings = async (): Promise<SiteSettings> => {
    try {
        const supabase = getPublicClient();
        const maxRetries = 2;
        let lastError: any = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const fetchPromise = supabase
                    .from('site_settings')
                    .select('*')
                    .eq('id', 'main')
                    .maybeSingle();

                let timeoutId: ReturnType<typeof setTimeout> | undefined;
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error('Connection timeout')), 10000);
                });

                let result: any;
                try {
                    result = await Promise.race([fetchPromise, timeoutPromise]) as any;
                } finally {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                }

                const { data, error } = result;

                if (error) {
                    lastError = error;
                    if (error.code === 'PGRST116' || attempt === maxRetries) {
                        break;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }

                if (!data) {
                    return getDefaultSettings();
                }

                return normalizeSiteSettings(data);
            } catch (err: any) {
                lastError = err;
                if (err?.message?.includes('timeout') && attempt < maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }
                break;
            }
        }

        if (lastError) {
            const errorMsg = lastError?.message || String(lastError);
            const errorCode = lastError?.code || 'UNKNOWN';
            if (typeof console !== 'undefined' && console.warn) {
                console.warn(`getSiteSettings: failed after ${maxRetries + 1} attempts, using defaults. Error: ${errorMsg} (Code: ${errorCode})`);
            }
        } else if (typeof console !== 'undefined' && console.warn) {
            console.warn('getSiteSettings: no data found for id "main", using defaults.');
        }

        return getDefaultSettings();
    } catch (err: any) {
        const errorMsg = err?.message || String(err);
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('getSiteSettings: unexpected error, using defaults.', errorMsg);
        }
        return getDefaultSettings();
    }
};
