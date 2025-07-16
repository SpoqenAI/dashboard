'use client';

import dynamic from 'next/dynamic';

const CallAnalyticsClient = dynamic(() => import('./CallAnalyticsClient'), {
  ssr: false,
  loading: () => <div className="p-6">Loading call analytics…</div>,
});

export default function CallAnalyticsClientLoader() {
  return <CallAnalyticsClient />;
}