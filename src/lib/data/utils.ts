
// Helper to get public URL for Supabase storage objects
export const getStoragePublicUrl = (path: string | null, bucket: string = 'business-images') => {
    if (!path) return null;

    // If it's already a full URL, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    // If it's a data URL, return as is
    if (path.startsWith('data:')) return path;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return path;

    // Clean the base URL (remove trailing slash)
    const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;

    // Clean the path (remove leading slash)
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // If it's a local public path (starts with placeholders or other known local dirs), 
    // and it was originally a / path, we might want to keep it.
    // However, business media should almost always be in storage.
    if (path.startsWith('/placeholders/') || path.startsWith('/images/')) {
        return path;
    }

    return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
};

/**
 * Extracts the storage path from a Supabase public URL
 * @param url The full public URL
 * @param bucket The bucket name
 */
export const extractStoragePath = (url: string | null, bucket: string = 'business-images') => {
    if (!url) return null;
    if (!url.includes(`/public/${bucket}/`)) return null;

    const parts = url.split(`/public/${bucket}/`);
    return parts.length > 1 ? parts[1] : null;
};

// Helper to parse Postgres array strings (e.g., "{val1,val2}") or JSON arrays
export const parsePostgresArray = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(v => typeof v === 'string' && v.length > 0);

    if (typeof value === 'string') {
        // Check if it's a Postgres array string: {val1,val2}
        if (value.startsWith('{') && value.endsWith('}')) {
            const content = value.substring(1, value.length - 1);
            if (!content) return [];

            // Handle quoted strings in Postgres arrays (to support spaces/commas)
            const results: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < content.length; i++) {
                const char = content[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    results.push(current.trim().replace(/^"(.*)"$/, '$1'));
                    current = '';
                } else {
                    current += char;
                }
            }
            results.push(current.trim().replace(/^"(.*)"$/, '$1'));
            return results.filter(Boolean);
        }

        // Check if it's a JSON array
        if (value.startsWith('[') && value.endsWith(']')) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed.filter(v => typeof v === 'string');
            } catch (e) {
                // Fall through to comma split
            }
        }

        // Fallback: simple comma split
        return value.split(',').map(s => s.trim()).filter(Boolean);
    }

    return [];
};
