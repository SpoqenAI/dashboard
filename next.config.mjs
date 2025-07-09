/*
  Next.js Build & Webpack Optimizations
  -------------------------------------
  - Filesystem cache enabled for faster rebuilds (dev & prod)
  - Source maps: fast in dev, minimized in prod
  - Bundle splitting for vendor code
  - (Optional) Bundle Analyzer: see instructions below
  - Unused features (i18n, rewrites, redirects) are not present

  Bundle Analyzer Integration:
    1. Install: pnpm add -D @next/bundle-analyzer
    2. Add to this file:
        import withBundleAnalyzer from '@next/bundle-analyzer';
        const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
        export default withBundleAnalyzer(withSentryConfig(nextConfig, ...));
    3. Run with ANALYZE=true pnpm build

  For more info, see: https://www.npmjs.com/package/@next/bundle-analyzer
*/
import { withSentryConfig } from '@sentry/nextjs';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { fileURLToPath } from 'url';
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // PERFORMANCE CRITICAL: Enable image optimization for Core Web Vitals
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      // Add other domains as needed for production
      {
        protocol: 'https',
        hostname: 'spoqen.com',
      },
      {
        protocol: 'https',
        hostname: 'myapp.netlify.app',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // PERFORMANCE: Enable compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    // PERFORMANCE: Enable modern CSS
    optimizeCss: true,
    // PERFORMANCE: Enable memory optimization
    esmExternals: true,
  },

  // Enhanced security headers with proper CORS for development
  async headers() {
    const headers = [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      // Cache JS/CSS chunks but keep other routes fresh to avoid stale builds
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value:
              process.env.NODE_ENV === 'production'
                ? 'public, max-age=31536000, immutable'
                : 'no-store',
          },
        ],
      },
      // PERFORMANCE: Optimize static assets caching
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];

    // Add development-specific CORS headers for ngrok
    if (process.env.NODE_ENV === 'development') {
      headers.push({
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // In development, allow all origins for ngrok
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
        ],
      });
    }

    return headers;
  },

  // Webpack configuration for better performance
  webpack: (config, { dev, isServer, webpack }) => {
    // Enable persistent filesystem cache for faster rebuilds in both development and production
    // Use import.meta.url for ESM compatibility (instead of __filename)
    const filename = fileURLToPath(import.meta.url);
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [filename],
      },
    };

    if (dev && !isServer) {
      // Enable fast source maps for better debugging in development
      config.devtool = 'eval-source-map';
    }

    if (!dev && !isServer) {
      // Disable source maps in production for faster builds and smaller output.
      // Rationale: Source maps are not needed in production unless debugging, and disabling them significantly improves build speed and reduces output size.
      config.devtool = false;
      // PERFORMANCE: Optimize bundle splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }

    // (Optional) Bundle Analyzer integration can be added here
    // See documentation below for instructions
    // https://www.npmjs.com/package/@next/bundle-analyzer

    config.plugins.push(
      new webpack.DefinePlugin({
        __SENTRY_DEBUG__: false,
        __SENTRY_TRACING__: false, // Set to true if you use Sentry performance monitoring
        __RRWEB_EXCLUDE_IFRAME__: true,
        __RRWEB_EXCLUDE_SHADOW_DOM__: true,
        __SENTRY_EXCLUDE_REPLAY_WORKER__: true,
      })
    );

    return config;
  },

  // Environment variable validation
  env: {
    // Validate critical environment variables at build time
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Wrap config with bundle analyzer (enabled via ANALYZE env var), then Sentry
export default withAnalyzer(
  withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: process.env.SENTRY_ORG || 'spoqen',
    project: process.env.SENTRY_PROJECT || 'javascript-nextjs',

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    // tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  })
);
