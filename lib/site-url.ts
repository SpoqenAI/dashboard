/**
 * Returns the site URL based on environment variables
 * Falls back to localhost with flexible port detection for development
 */
export function getSiteUrl() {
  // Use NEXT_PUBLIC_SITE_URL if available (production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Use NEXT_PUBLIC_VERCEL_URL if available (preview deployments)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // For development, check if we're in browser context and can use window.location
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }

  // Server-side fallback for development
  // Check for common development ports
  const devPort = process.env.NEXT_PUBLIC_DEV_PORT || process.env.PORT || '3000';
  return `http://localhost:${devPort}`;
}
