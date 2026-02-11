-- Create messages table for business inquiries
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_name TEXT,
    sender_email TEXT,
    content TEXT NOT NULL,
    is_from_business BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Anyone can send a message (to support non-logged in users using the contact form)
-- But if is_from_business is true, they MUST be the business owner or admin
CREATE POLICY "Anyone can send a regular message" ON public.messages
    FOR INSERT 
    WITH CHECK (
        (is_from_business = false) OR 
        (
            auth.uid() IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid()
                AND (role = 'admin' OR business_id = messages.business_id)
            )
        )
    );

-- 2. Business owners and admins can view messages for their business
CREATE POLICY "Owners and admins can view messages" ON public.messages
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR business_id = messages.business_id)
        )
    );

-- 3. Business owners and admins can update messages (e.g., mark as read)
CREATE POLICY "Owners and admins can update messages" ON public.messages
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR business_id = messages.business_id)
        )
    );

-- 4. Users can see messages they sent
CREATE POLICY "Users can view their own sent messages" ON public.messages
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        sender_id = auth.uid()
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_business_id ON public.messages(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
