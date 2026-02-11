
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkTable() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tables, error } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .eq('tablename', 'analytics_events');

    if (error) {
        // Alternative check
        const { error: queryError } = await supabase
            .from('analytics_events')
            .select('*')
            .limit(1);

        if (queryError && queryError.code === 'PGRST116') {
            console.log('Table carousel_analytics probably does not exist');
        } else if (queryError) {
            console.log('Query error:', queryError);
        } else {
            console.log('Table exists and is queryable');
        }
    } else {
        console.log('Tables check:', tables);
    }
}

checkTable();
