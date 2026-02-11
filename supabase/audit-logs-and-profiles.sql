-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL, -- e.g., 'delete_review', 'approve_claim', 'update_role'
    target_type text NOT NULL, -- e.g., 'review', 'business_claim', 'profile'
    target_id text, -- ID of the object being acted upon
    details jsonb DEFAULT '{}', -- Additional context (old values, new values, reasons)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Profiles Update
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auto_approve_media boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_preferences jsonb DEFAULT '{
    "marketing": true,
    "system": true,
    "review_replies": true,
    "claim_updates": true
}'::jsonb;

-- Function to record audit logs (optional helper)
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be used if we wanted DB-level logging, 
    -- but usually application-level logging is more descriptive for admin actions.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
