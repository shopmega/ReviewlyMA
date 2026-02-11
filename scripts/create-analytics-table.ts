
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function createAnalyticsTable() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const sql = `
    CREATE TABLE IF NOT EXISTS carousel_analytics (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        collection_id TEXT,
        event_type TEXT CHECK (event_type IN ('impression', 'click')),
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        session_id TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
    );

    -- RLS Policies
    ALTER TABLE carousel_analytics ENABLE ROW LEVEL SECURITY;
    
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert carousel analytics') THEN
            CREATE POLICY "Public can insert carousel analytics" ON carousel_analytics
                FOR INSERT WITH CHECK (true);
        END IF;
    END $$;

    GRANT ALL ON carousel_analytics TO service_role;
    GRANT INSERT ON carousel_analytics TO anon;
    GRANT INSERT ON carousel_analytics TO authenticated;
    `;

    console.log('Sending table creation SQL...');

    // Check if we can run RPC
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (rpcError) {
        console.error('RPC Error (Table creation failed):', rpcError);
        console.log('Please run the following SQL in your Supabase SQL Editor:');
        console.log(sql);
    } else {
        console.log('Table carousel_analytics created/verified successfully.');
    }
}

createAnalyticsTable();
