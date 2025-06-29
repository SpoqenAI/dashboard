import type React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { Providers } from '@/lib/providers';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'Spoqen - AI Receptionist',
  description: 'Never miss a lead again with Spoqen, your AI receptionist',
  generator: 'v0.dev',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Providers>{children}</Providers>
          <Toaster />
        </AuthProvider>
        {/* Vercel Analytics / Speed Insights */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
