/**
 * Returns the site URL based on environment variables
 * Falls back to localhost with flexible port detection for development
 */
export function getSiteUrl() {
  // Debug logging to help troubleshoot PKCE issues (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('getSiteUrl() called with env vars:', {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
      NEXT_PUBLIC_DEV_PORT: process.env.NEXT_PUBLIC_DEV_PORT,
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      isClient: typeof window !== 'undefined',
      windowLocation: typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'N/A'
    });
  }

  // Use NEXT_PUBLIC_SITE_URL if available (production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Using NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
    }
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Use NEXT_PUBLIC_VERCEL_URL if available (preview deployments)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    const url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    if (process.env.NODE_ENV === 'development') {
      console.log('Using NEXT_PUBLIC_VERCEL_URL:', url);
    }
    return url;
  }

  // For development, check if we're in browser context and can use window.location
  if (typeof window !== 'undefined') {
    const url = `${window.location.protocol}//${window.location.host}`;
    if (process.env.NODE_ENV === 'development') {
      console.log('Using window.location:', url);
    }
    return url;
  }

  // Server-side fallback for development
  // Check for common development ports
  const devPort = process.env.NEXT_PUBLIC_DEV_PORT || process.env.PORT || '3000';
  const url = `http://localhost:${devPort}`;
  if (process.env.NODE_ENV === 'development') {
    console.log('Using server-side fallback:', url);
  }
  return url;
}
