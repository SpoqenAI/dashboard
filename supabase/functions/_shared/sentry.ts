// Shared Sentry configuration for Supabase Edge Functions
// Based on: https://docs.sentry.io/platforms/javascript/guides/deno/
// and: https://supabase.com/docs/guides/functions/examples/sentry-monitoring

import * as Sentry from 'https://esm.sh/@sentry/deno@9.40.0';

// Initialize Sentry for Edge Functions
export function initSentry() {
  const dsn = Deno.env.get('SENTRY_DSN');

  if (!dsn) {
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.warn('SENTRY_DSN not configured, Sentry monitoring disabled');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: Deno.env.get('ENVIRONMENT') || 'development',
    release: Deno.env.get('RELEASE_VERSION') || '1.0.0',
    debug: Deno.env.get('SENTRY_DEBUG') === 'true',
    integrations: [
      // Add any specific integrations for Deno/Edge Functions
    ],
    // Configure sampling for performance monitoring
    tracesSampleRate: 0.1,
    // Configure sampling for session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  if (Deno.env.get('ENVIRONMENT') !== 'production') {
    console.log('Sentry initialized for Edge Function');
  }
}

// Helper function to capture exceptions with context
export function captureException(error: Error, context?: Record<string, any>) {
  try {
    if (context) {
      Sentry.setContext('function_context', context);
    }
    Sentry.captureException(error);
  } catch (sentryError) {
    // Fallback to console if Sentry fails (dev only)
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.error('Failed to send to Sentry:', sentryError);
      console.error('Original error:', error);
      if (context) {
        console.error('Context:', context);
      }
    }
  }
}

// Helper function to add breadcrumbs
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, any>
) {
  try {
    Sentry.addBreadcrumb({
      message,
      category: category || 'function',
      data,
      level: 'info',
    });
  } catch (sentryError) {
    // Fallback to console if Sentry fails (dev only)
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.warn('Failed to add Sentry breadcrumb:', sentryError);
    }
  }
}

// Helper function to set user context
export function setUser(userId: string, email?: string) {
  try {
    Sentry.setUser({
      id: userId,
      email,
    });
  } catch (sentryError) {
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.warn('Failed to set Sentry user:', sentryError);
    }
  }
}

// Helper function to set tags
export function setTag(key: string, value: string) {
  try {
    Sentry.setTag(key, value);
  } catch (sentryError) {
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.warn('Failed to set Sentry tag:', sentryError);
    }
  }
}

// Helper function to start a transaction
export function startTransaction(name: string, operation?: string) {
  try {
    return Sentry.startTransaction({
      name,
      op: operation || 'function',
    });
  } catch (sentryError) {
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.warn('Failed to start Sentry transaction:', sentryError);
    }
    return null;
  }
}

// Export Sentry instance for direct access if needed
export { Sentry };
