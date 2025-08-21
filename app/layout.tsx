import type React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';
import { Toaster } from '@/components/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { GlobalHeader } from '@/components/global-header';
import { ThemeProvider } from '@/components/theme-provider';
import PaddleProvider from '@/components/paddle-provider';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
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
    // ...other integrations (if any)
  ],
  tracesSampleRate: 1,
  debug: process.env.NODE_ENV !== 'production',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.spoqen.com'),
  title: 'Spoqen – AI Receptionist & Personal AI Agent',
  description:
    'Never miss a lead again with Spoqen – your personal AI receptionist that answers calls 24/7, qualifies prospects, and syncs voicemails to your CRM.',
  openGraph: {
    title: 'Spoqen – AI Receptionist & Personal AI Agent',
    description:
      'Never miss a lead again with Spoqen – your personal AI receptionist that answers calls 24/7, qualifies prospects, and syncs voicemails to your CRM.',
    images: '/Icon(2).png',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spoqen – AI Receptionist & Personal AI Agent',
    description:
      'Never miss a lead again with Spoqen – your personal AI receptionist that answers calls 24/7, qualifies prospects, and syncs voicemails to your CRM.',
    images: '/Icon(2).png',
  },
  alternates: {
    canonical: 'https://www.spoqen.com/',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
  },
  icons: {
    icon: [
      {
        url: '/Icon(2).png',
        sizes: 'any',
      },
    ],
    shortcut: '/Icon.png',
    apple: [
      {
        url: '/Icon.png',
        type: 'image/png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Force-animations removed; handled per component */}
        <Script
          id="ld-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Spoqen',
              url: 'https://www.spoqen.com',
              logo: 'https://www.spoqen.com/Icon(2).png',
            }),
          }}
        />
        <Script
          id="ld-product"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: 'Spoqen AI Receptionist',
              description:
                'An interactive AI voicemail assistant that answers calls, qualifies leads, and syncs with your CRM.',
              image: 'https://www.spoqen.com/Icon(2).png',
              offers: {
                '@type': 'Offer',
                url: 'https://www.spoqen.com/signup',
                price: '49',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
            }),
          }}
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="absolute left-0 top-0 -translate-y-full bg-background px-4 py-2 text-sm focus:translate-y-0 focus:outline-none"
        >
          Skip to main content
        </a>
        <PaddleProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
          >
            <AuthProvider>
              <NuqsAdapter>
                <GlobalHeader />
                {children}
                <Toaster />
              </NuqsAdapter>
            </AuthProvider>
            <Script id="preload-fix-script" strategy="afterInteractive">
              {`
                (function () {
                  if (typeof window === 'undefined') return;
                  document.documentElement.classList.remove('preload');
                })();
              `}
            </Script>
            {/* PERF: mark animations done after first scroll to stop heavy keyframes */}
            <Script id="motion-done-script" strategy="afterInteractive">
              {`
                (function () {
                  if (typeof window === 'undefined') return;
                  const onFirstScroll = () => {
                    document.documentElement.classList.add('motion-done');
                    window.removeEventListener('scroll', onFirstScroll);
                  };
                  window.addEventListener('scroll', onFirstScroll, { passive: true, once: true });
                })();
              `}
            </Script>
            {/* Vercel Analytics & Speed Insights */}
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </PaddleProvider>
      </body>
    </html>
  );
}
