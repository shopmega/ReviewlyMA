import type { NextConfig } from 'next';

function hostFromUrl(maybeUrl?: string): string | null {
  if (!maybeUrl) return null;
  try {
    return new URL(maybeUrl).host; // host includes :port when present
  } catch {
    return null;
  }
}

function hostFromMaybeHostOrUrl(maybeHostOrUrl?: string): string | null {
  if (!maybeHostOrUrl) return null;
  // VERCEL_URL is typically "my-app.vercel.app" (no scheme). Next wants host:port.
  if (!maybeHostOrUrl.includes('://')) return maybeHostOrUrl;
  return hostFromUrl(maybeHostOrUrl);
}

const serverActionAllowedOrigins = Array.from(
  new Set(
    [
      // Local dev
      'localhost:9002',
      '127.0.0.1:9002',

      // Deployed origins (set at build time)
      hostFromUrl(process.env.NEXT_PUBLIC_SITE_URL),
      hostFromUrl(process.env.SITE_URL),
      hostFromMaybeHostOrUrl(process.env.NEXT_PUBLIC_VERCEL_URL),
      hostFromMaybeHostOrUrl(process.env.VERCEL_URL),
    ].filter(Boolean) as string[]
  )
);

const supabaseImageHosts = Array.from(
  new Set(
    [
      hostFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
      // Legacy project host kept for backward compatibility with already-stored URLs.
      'vsqzhlpntcbamdbqvyoq.supabase.co',
    ].filter(Boolean) as string[]
  )
);

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: false, // Disable to reduce RSC issues
  // External packages for server components
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  // Transpile packages that need client-side rendering
  transpilePackages: ['lucide-react'],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
    // Fix Server Actions header issues
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins,
      bodySizeLimit: '8mb',
    },
    // Disable problematic features that cause RSC issues
    ppr: false,
    // Disable RSC prefetching completely
    serverMinification: false,
  },
  // Turbopack configuration
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  // Cache configuration for optimal performance
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    pagesBufferLength: 5,
  },
  // Optimize production builds
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  // Disable static generation optimization that can cause RSC issues
  staticPageGenerationTimeout: 60,
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
        port: '',
        pathname: '/**',
      },
      ...supabaseImageHosts.map((hostname) => ({
        protocol: 'https' as const,
        hostname,
        port: '',
        pathname: '/storage/v1/object/public/**',
      })),
      {
        protocol: 'https',
        hostname: 'image.cnbcfm.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Enable image optimization
    formats: ['image/avif', 'image/webp'],
    // Cache images in production
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },
  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), camera=(), microphone=()',
          },
          {
            key: 'Content-Security-Policy',
            // Keep CSP compatible with GTM/GA, but remove unsafe-eval (stronger XSS baseline).
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
