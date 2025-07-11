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
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
      debug: false,
    });

    window.__sentry = Sentry;

    // Optional: forward router transition events once SDK is ready
    if (Sentry.captureRouterTransitionStart) {
      window.onRouterTransitionStart = Sentry.captureRouterTransitionStart;
    }
  } catch (err) {
    // Optionally log the error or handle gracefully
    // eslint-disable-next-line no-console
    console.warn('Sentry failed to load:', err);
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
