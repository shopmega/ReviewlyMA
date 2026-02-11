-- Clear and refresh site settings to ensure they're properly cached

-- First, let's verify the current site settings
SELECT 
    id,
    site_name,
    site_description,
    contact_email,
    maintenance_mode,
    updated_at
FROM site_settings 
WHERE id = 'main';

-- Update the updated_at field to force cache invalidation
UPDATE site_settings 
SET updated_at = NOW()
WHERE id = 'main';

-- Verify the update worked
SELECT 
    id,
    site_name,
    site_description,
    contact_email,
    maintenance_mode,
    updated_at
FROM site_settings 
WHERE id = 'main';

-- If the site_settings table doesn't exist, create it with the proper schema
DO $$ 
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_settings') THEN
        -- Create the site_settings table
        CREATE TABLE public.site_settings (
          id text primary key default 'main',
          site_name text not null default 'Avis.ma',
          site_description text,
          contact_email text,
          support_phone text,
          facebook_url text,
          twitter_url text,
          instagram_url text,
          linkedin_url text,
          maintenance_mode boolean default false,
          allow_new_registrations boolean default true,
          require_email_verification boolean default true,
          default_language text default 'fr',
          updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
          
          -- Feature toggles
          enable_reviews BOOLEAN DEFAULT true,
          enable_salaries BOOLEAN DEFAULT true,
          enable_interviews BOOLEAN DEFAULT true,
          enable_messaging BOOLEAN DEFAULT false,
          enable_claims BOOLEAN DEFAULT true,
          
          -- Premium pricing
          premium_annual_price NUMERIC DEFAULT 500.00,
          premium_monthly_price NUMERIC DEFAULT 50.00,
          tier_growth_monthly_price NUMERIC DEFAULT 99.00,
          tier_growth_annual_price NUMERIC DEFAULT 990.00,
          tier_pro_monthly_price NUMERIC DEFAULT 299.00,
          tier_pro_annual_price NUMERIC DEFAULT 2900.00,
          premium_enabled BOOLEAN DEFAULT true,
          premium_description TEXT DEFAULT 'Devenez membre Premium et bénéficiez de fonctionnalités exclusives pour propulser votre établissement.',
          
          -- Branding
          site_logo_url TEXT,
          google_analytics_id TEXT,
          facebook_pixel_id TEXT,
          office_address TEXT DEFAULT 'Casablanca, Morocco',
          office_phone TEXT,
          copyright_text TEXT,
          
          -- UI Configuration
          home_sections_config JSONB DEFAULT '[
            {"id": "hero", "visible": true},
            {"id": "stats", "visible": true},
            {"id": "collections", "visible": true},
            {"id": "categories", "visible": true},
            {"id": "cities", "visible": true},
            {"id": "featured", "visible": true}
          ]'::jsonb,
          popular_searches_config JSONB DEFAULT '[
            {"label": "Restaurants à Casablanca", "href": "/businesses?search=Restaurant&city=Casablanca"},
            {"label": "Salons de coiffure", "href": "/businesses?search=Coiffure"},
            {"label": "Hôtels à Rabat", "href": "/businesses?category=Hôtels&city=Rabat"}
          ]'::jsonb,
          
          -- Email configuration
          email_provider TEXT DEFAULT 'console',
          resend_api_key TEXT,
          sendgrid_api_key TEXT,
          mailjet_api_key TEXT,
          mailjet_api_secret TEXT,
          email_from TEXT DEFAULT 'noreply@avis.ma',
          
          -- Payment configuration
          payment_bank_name TEXT,
          payment_rib_number TEXT,
          payment_beneficiary TEXT,
          payment_chari_url TEXT,
          payment_methods_enabled TEXT[] DEFAULT '{bank_transfer}'
        );

        -- Enable RLS
        ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Settings are viewable by everyone" ON site_settings FOR SELECT USING (TRUE);
        CREATE POLICY "Admins can update settings" ON site_settings FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
        CREATE POLICY "Admins can insert settings" ON site_settings FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );

        -- Insert default settings
        INSERT INTO site_settings (id, site_name, site_description, contact_email) 
        VALUES ('main', 'Avis.ma', 'Trouvez des avis sur les établissements, les services et les produits.', 'contact@avis.ma')
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'site_settings table created and initialized';
    ELSE
        RAISE NOTICE 'site_settings table already exists';
    END IF;
END $$;

-- Final verification
SELECT 
    id,
    site_name,
    site_description,
    contact_email,
    maintenance_mode,
    updated_at
FROM site_settings 
WHERE id = 'main';