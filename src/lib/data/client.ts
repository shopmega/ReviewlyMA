
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Safe client for static generation (no cookies)
let publicClient: any = null;

export const getPublicClient = () => {
    if (publicClient) return publicClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!url || !key) {
        console.warn('Supabase URL or Key missing in environment variables');
    }

    publicClient = createSupabaseClient(url || '', key || '', {
        db: {
            schema: 'public',
        },
        global: {
            fetch: (url, options = {}) => {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

                return fetch(url, {
                    ...options,
                    signal: controller.signal,
                }).finally(() => {
                    clearTimeout(timeoutId);
                });
            },
        },
    });
    return publicClient;
}
