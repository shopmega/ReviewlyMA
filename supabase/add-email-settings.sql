-- Add email configuration fields to site_settings table
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS email_provider TEXT DEFAULT 'console',
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS sendgrid_api_key TEXT,
ADD COLUMN IF NOT EXISTS mailjet_api_key TEXT,
ADD COLUMN IF NOT EXISTS mailjet_api_secret TEXT,
ADD COLUMN IF NOT EXISTS email_from TEXT DEFAULT 'noreply@avis.ma';