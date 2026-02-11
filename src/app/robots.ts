import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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
        sitemap: 'https://avis.ma/sitemap.xml',
    };
}
