import type React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'Spoqen - AI Receptionist',
  description: 'Never miss a lead again with Spoqen, your AI receptionist',
  openGraph: {
    images: '/Spoqen.png',
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
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster />
          {/* Vercel Analytics & Speed Insights */}
          <Analytics />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
