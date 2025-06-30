/**
 * Returns the site URL based on environment variables
 * Falls back to localhost with flexible port detection for development
 * Enhanced with ngrok support and production-ready fallbacks
 */
import { logger } from '@/lib/logger';

export function getSiteUrl() {
  // Debug logging to help troubleshoot PKCE issues (only in development)
  if (process.env.NODE_ENV === 'development') {
    logger.debug('SITE_URL', 'getSiteUrl() called with env vars', {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
      NEXT_PUBLIC_DEV_PORT: process.env.NEXT_PUBLIC_DEV_PORT,
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      isClient: typeof window !== 'undefined',
      windowLocation:
        typeof window !== 'undefined'
          ? `${window.location.protocol}//${window.location.host}`
          : 'N/A',
    });
  }

  // Priority 1: Use NEXT_PUBLIC_SITE_URL if available (production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('SITE_URL', 'Using NEXT_PUBLIC_SITE_URL', {
        url: process.env.NEXT_PUBLIC_SITE_URL,
      });
    }
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Priority 2: Use NEXT_PUBLIC_APP_URL (for assistant provisioning compatibility)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('SITE_URL', 'Using NEXT_PUBLIC_APP_URL', {
        url: process.env.NEXT_PUBLIC_APP_URL,
      });
    }
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Priority 3: Use NEXT_PUBLIC_VERCEL_URL if available (preview deployments)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    const url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    if (process.env.NODE_ENV === 'development') {
      logger.debug('SITE_URL', 'Using NEXT_PUBLIC_VERCEL_URL', { url });
    }
    return url;
  }

  // Priority 4: Auto-detect ngrok URL from request headers (development)
  if (typeof window !== 'undefined' && window.location.host.includes('ngrok')) {
    const url = `${window.location.protocol}//${window.location.host}`;
    if (process.env.NODE_ENV === 'development') {
      logger.debug('SITE_URL', 'Auto-detected ngrok URL from window.location', {
        url,
      });
    }
    return url;
  }

  // Priority 5: For development, check if we're in browser context and can use window.location
  if (typeof window !== 'undefined') {
    const url = `${window.location.protocol}//${window.location.host}`;
    if (process.env.NODE_ENV === 'development') {
      logger.debug('SITE_URL', 'Using window.location', { url });
    }
    return url;
  }

  // Priority 6: Server-side fallback for development
  // Check for common development ports
  const devPort =
    process.env.NEXT_PUBLIC_DEV_PORT || process.env.PORT || '3000';
  const url = `http://localhost:${devPort}`;

  if (process.env.NODE_ENV === 'development') {
    logger.debug('SITE_URL', 'Using localhost fallback', { url, devPort });
  }

  return url;
}

/**
 * Enhanced function specifically for assistant provisioning and webhook URLs
 * Provides additional validation and fallbacks
 */
export function getAppUrl(): string {
  const siteUrl = getSiteUrl();

  // Validate that we have a proper URL for production systems
  if (process.env.NODE_ENV === 'production' && siteUrl.includes('localhost')) {
    logger.error(
      'SITE_URL',
      'Production environment using localhost URL',
      new Error('Invalid production URL'),
      {
        siteUrl,
        environment: process.env.NODE_ENV,
      }
    );
    throw new Error(
      'Production environment requires a proper domain URL. Please set NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL environment variable.'
    );
  }

  return siteUrl;
}

/**
 * Auto-detect ngrok URL from request headers (server-side)
 * This helps with development when environment variables aren't set
 */
export function detectNgrokUrl(request?: Request): string | null {
  if (!request) return null;

  const host = request.headers.get('host');
  const forwarded = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';

  // Check for ngrok in host headers
  const ngrokHost = forwarded?.includes('ngrok')
    ? forwarded
    : host?.includes('ngrok')
      ? host
      : null;

  if (ngrokHost) {
    const url = `${proto}://${ngrokHost}`;
    logger.debug('SITE_URL', 'Auto-detected ngrok URL from request headers', {
      url,
      host,
      forwarded,
      proto,
    });
    return url;
  }

  return null;
}
