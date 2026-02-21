import type React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';
import { Toaster } from '@/components/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { LandingHeader } from '@/components/landing-header';
// Sentry is initialized via sentry.client.config.ts / sentry.server.config.ts / sentry.edge.config.ts

export const metadata: Metadata = {
  metadataBase: new URL('https://www.spoqen.com'),
  title: 'Spoqen – All-in-One Prompt Building Platform for Voice AI',
  description:
    'Simplify complex voice AI flows with Spoqen – the ultimate platform for building, testing, and deploying powerful conversational prompts.',
  openGraph: {
    title: 'Spoqen – All-in-One Prompt Building Platform for Voice AI',
    description:
      'Simplify complex voice AI flows with Spoqen – the ultimate platform for building, testing, and deploying powerful conversational prompts.',
    images: '/Icon(2).png',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spoqen – All-in-One Prompt Building Platform for Voice AI',
    description:
      'Simplify complex voice AI flows with Spoqen – the ultimate platform for building, testing, and deploying powerful conversational prompts.',
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
              name: 'Spoqen AI Prompt Builder',
              description:
                'An all-in-one platform to simplify and structure complex prompt graphs for voice AI agents.',
              image: 'https://www.spoqen.com/Icon(2).png',
              offers: {
                '@type': 'Offer',
                url: 'https://www.spoqen.com/#pricing',
                price: '99',
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          {/* Spacer for fixed header height */}
          <div aria-hidden className="h-16" />
          <LandingHeader />
          {children}
          <Toaster />
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
      </body>
    </html>
  );
}
