-- Business Reports Table
CREATE TABLE IF NOT EXISTS public.business_reports (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id text REFERENCES public.businesses(id) ON DELETE CASCADE,
    reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reason text NOT NULL, -- 'closed', 'duplicate', 'incorrect_info', 'offensive', 'scam', 'other'
    details text,
    status text DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
    admin_notes text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Business Reports
ALTER TABLE public.business_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report businesses" ON public.business_reports
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own reports" ON public.business_reports
FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Admins can manage all business reports" ON public.business_reports
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_business_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_business_report_updated
    BEFORE UPDATE ON public.business_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_business_reports_updated_at();
