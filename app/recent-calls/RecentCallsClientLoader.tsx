'use client';

import dynamic from 'next/dynamic';

const RecentCallsClient = dynamic(() => import('./RecentCallsClient'), {
  ssr: false,
  loading: () => <div className="p-6">Loading recent calls…</div>,
});

export default function RecentCallsClientLoader() {
  return <RecentCallsClient />;
}