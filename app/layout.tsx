import type React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/toaster';

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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
