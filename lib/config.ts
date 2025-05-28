/**
 * Application configuration
 */

/**
 * Get admin emails from environment variable or fallback to default list
 * In production, set ADMIN_EMAILS as a comma-separated list
 * For development fallbacks, set FALLBACK_ADMIN_EMAILS as a comma-separated list
 */
export function getAdminEmails(): string[] {
  const envAdminEmails = process.env.ADMIN_EMAILS;
  
  if (envAdminEmails) {
    return envAdminEmails.split(',').map(email => email.trim()).filter(Boolean);
  }
  
  // Fallback admin emails from environment variables
  // Set FALLBACK_ADMIN_EMAILS in your .env.local file for development
  const fallbackAdminEmails = process.env.FALLBACK_ADMIN_EMAILS;
  
  if (fallbackAdminEmails) {
    return fallbackAdminEmails.split(',').map(email => email.trim()).filter(Boolean);
  }
  
  // Final fallback - empty array or placeholder emails
  // This ensures no real emails are hardcoded in the source
  return [
    'admin@example.com',
    'developer@example.com',
  ];
}

/**
 * Check if debug tools should be enabled
 */
export function isDebugEnabled(): boolean {
  // Always allow in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // In production, check if debug mode is explicitly enabled
  return process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true';
}

/**
 * Check if the current environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
} 