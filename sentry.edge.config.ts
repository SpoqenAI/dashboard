// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [Sentry.captureConsoleIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Set environment
  environment: process.env.NODE_ENV,

  // Enable Sentry Logs feature (supported shape)
  _experiments: { enableLogs: true },

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
