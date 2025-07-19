/**
 * Application configuration
 */

/**
 * Simple email validation function
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get admin emails from environment variable or fallback to default list
 * In production, set ADMIN_EMAILS as a comma-separated list
 * For development fallbacks, set FALLBACK_ADMIN_EMAILS as a comma-separated list
 */
export function getAdminEmails(): string[] {
  const envAdminEmails = process.env.ADMIN_EMAILS;

  if (envAdminEmails) {
    return envAdminEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email && isValidEmail(email));
  }

  // Fallback admin emails from environment variables
  // Set FALLBACK_ADMIN_EMAILS in your .env.local file for development
  const fallbackAdminEmails = process.env.FALLBACK_ADMIN_EMAILS;

  if (fallbackAdminEmails) {
    return fallbackAdminEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email && isValidEmail(email));
  }

  // Final fallback - empty array for security
  // This ensures no real emails are hardcoded and fails securely
  return [];
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
  return process.env.ENABLE_DEBUG === 'true';
}

/**
 * Check if the current environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Paddle configuration validation
 */
export function getPaddleConfig() {
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (!clientToken) {
    throw new Error(
      'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN environment variable is required but not set'
    );
  }

  const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as
    | 'sandbox'
    | 'production'
    | undefined;

  if (environment && !['sandbox', 'production'].includes(environment)) {
    throw new Error(
      `Invalid Paddle environment: ${environment}. Must be 'sandbox' or 'production'`
    );
  }

  return {
    clientToken,
    environment: environment || 'production',
  };
}

/**
 * Comprehensive Paddle pricing configuration validation
 */
export function validatePaddleConfiguration() {
  const config = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[],
    priceIds: {
      starter: {
        monthly: process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID,
        annual: process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID,
      },
      pro: {
        monthly: process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID,
        annual: process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID,
      },
    },
    webhookConfig: {
      hasSecret: !!process.env.PADDLE_WEBHOOK_SECRET,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    },
  };

  // Check required price IDs
  if (!config.priceIds.starter.monthly) {
    config.errors.push(
      'NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID is not set'
    );
  }

  if (!config.priceIds.starter.annual) {
    config.errors.push('NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID is not set');
  }

  // Check pro tier (warnings since they might not be needed yet)
  if (!config.priceIds.pro.monthly) {
    config.warnings.push('NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID is not set');
  }

  if (!config.priceIds.pro.annual) {
    config.warnings.push('NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID is not set');
  }

  // Check webhook configuration
  if (!config.webhookConfig.hasSecret) {
    config.errors.push(
      'PADDLE_WEBHOOK_SECRET is not set - webhooks will not work'
    );
  }

  if (!config.webhookConfig.siteUrl) {
    config.warnings.push(
      'NEXT_PUBLIC_SITE_URL is not set - webhook URL may be incorrect'
    );
  }

  // Validate price ID format
  const priceIdPattern = /^pri_[a-z0-9]{24}$/;

  Object.entries(config.priceIds).forEach(([tier, prices]) => {
    Object.entries(prices).forEach(([cycle, priceId]) => {
      if (priceId && !priceIdPattern.test(priceId)) {
        config.errors.push(
          `Invalid price ID format for ${tier} ${cycle}: ${priceId}`
        );
      }
    });
  });

  config.isValid = config.errors.length === 0;

  return config;
}
