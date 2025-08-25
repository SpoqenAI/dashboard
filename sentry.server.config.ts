// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseIntegration } from '@supabase/sentry-js-integration';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [
    supabaseIntegration(SupabaseClient, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),
    Sentry.captureConsoleIntegration(),
    // ...other integrations (if any)
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Set environment
  environment: process.env.NODE_ENV,

  // Enable Sentry Logs feature
  _experiments: { features: ['logs'] },

  // Configure sampling for different transaction types
  tracesSampler: samplingContext => {
    // Sample 100% of transactions in development
    if (process.env.NODE_ENV === 'development') {
      return 1.0;
    }

    // Sample 10% of transactions in production
    if (process.env.NODE_ENV === 'production') {
      return 0.1;
    }

    // Default sampling
    return 0.1;
  },
});
