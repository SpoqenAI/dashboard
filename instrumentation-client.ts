// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

// Defer loading of the heavy Sentry browser SDK until after the page has fully loaded.
// This removes ~90 kB of JavaScript from the critical path but still gives us error monitoring.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __sentry?: unknown;
    onRouterTransitionStart?: unknown;
  }
}

/**
 * Dynamically imports and initialises Sentry after the `load` event or during idle time.
 */
async function initSentry() {
  // Avoid loading twice.
  if (window.__sentry) return;

  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Add optional integrations for additional features
      integrations: [Sentry.replayIntegration()],

      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Define how likely Replay events are sampled.
      // This sets the sample rate to be 10%. You may want this to be 100% while
      // in development and sample at a lower rate in production
      replaysSessionSampleRate:
        process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Define how likely Replay events are sampled when an error occurs.
      replaysOnErrorSampleRate: 1.0,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: process.env.NODE_ENV === 'development',

      // Set environment
      environment: process.env.NODE_ENV,

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

    window.__sentry = Sentry;

    // Optional: forward router transition events once SDK is ready
    if (Sentry.captureRouterTransitionStart) {
      window.onRouterTransitionStart = Sentry.captureRouterTransitionStart;
    }
  } catch (err) {
    // Optionally log the error or handle gracefully
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Sentry failed to load:', err);
    }
  }
}

// Use `requestIdleCallback` when available; otherwise fall back to window load.
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(initSentry);
  } else if (document.readyState === 'complete') {
    initSentry();
  } else {
    (window as any).addEventListener('load', initSentry);
  }
}

export {}; // Make this file a module to enable global augmentation
