
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            db: {
                schema: 'public',
            },
            global: {
                fetch: (url, options = {}) => {
                    // Create AbortController for timeout (browser-compatible)
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
        }
    )
}
