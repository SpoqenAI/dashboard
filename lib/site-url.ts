/**
 * Returns the site URL based on environment variables
 * Falls back to localhost:3000 for development
 */
export function getSiteUrl() {
  // Use NEXT_PUBLIC_SITE_URL if available (production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // Use NEXT_PUBLIC_VERCEL_URL if available (preview deployments)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }

  // Fallback to localhost for development
  return "http://localhost:3000"
}
