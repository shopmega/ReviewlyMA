import { MetadataRoute } from 'next';
import { getServerSiteUrl } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
    const siteUrl = getServerSiteUrl();
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin/',
                '/dashboard/',
                '/api/',
                '/auth/',
                '/*?*', // Disallow query params except explicitly allowed ones to prevent crawl loops
            ],
        },
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
