import type { MetadataRoute } from 'next';
// Triggering new Vercel deployment for slug fix
import { getServerSiteUrl, getSiteName } from '@/lib/site-config';

export default function manifest(): MetadataRoute.Manifest {
  const siteUrl = getServerSiteUrl();
  const name = getSiteName();

  return {
    name,
    short_name: 'AVis',
    description: 'Évaluez les meilleurs employeurs au Maroc',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0F172A',
    theme_color: '#0F172A',
    categories: ['business', 'reviews', 'directories'],
    lang: 'fr',
    icons: [
      {
        src: '/app-favicon.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
      {
        src: '/app-logo.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    id: siteUrl,
  };
}
