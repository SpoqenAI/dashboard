import type React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';
import { Toaster } from '@/components/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { GlobalHeader } from '@/components/global-header';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'Spoqen – AI Receptionist & Personal AI Agent',
  description:
    'Never miss a lead again with Spoqen – your personal AI receptionist that answers calls 24/7, qualifies prospects, and syncs voicemails to your CRM.',
  openGraph: {
    title: 'Spoqen – AI Receptionist & Personal AI Agent',
    description:
      'Never miss a lead again with Spoqen – your personal AI receptionist that answers calls 24/7, qualifies prospects, and syncs voicemails to your CRM.',
    images: '/Spoqen.png',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spoqen – AI Receptionist & Personal AI Agent',
    description:
      'Never miss a lead again with Spoqen – your personal AI receptionist that answers calls 24/7, qualifies prospects, and syncs voicemails to your CRM.',
    images: '/Spoqen.png',
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
    icon: '/Spoqen.png', // Fallback favicon
    shortcut: '/Spoqen.png',
    apple: '/Spoqen.png',
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
        <Script
          id="ld-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Spoqen',
              url: 'https://www.spoqen.com',
              logo: 'https://www.spoqen.com/Spoqen-full.png',
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
              image: 'https://www.spoqen.com/Spoqen.png',
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <GlobalHeader />
            {children}
            <Toaster />
            {/* Vercel Analytics & Speed Insights */}
            <Analytics />
            <SpeedInsights />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
