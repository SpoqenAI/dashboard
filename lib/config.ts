/**
 * Application configuration
 */

/**
 * Get admin emails from environment variable or fallback to default list
 * In production, set ADMIN_EMAILS as a comma-separated list
 */
export function getAdminEmails(): string[] {
  const envAdminEmails = process.env.ADMIN_EMAILS;
  
  if (envAdminEmails) {
    return envAdminEmails.split(',').map(email => email.trim()).filter(Boolean);
  }
  
  // Fallback admin emails for development
  // In production, these should be set via environment variables
  return [
    'admin@spoqen.com',
    'developer@spoqen.com',
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