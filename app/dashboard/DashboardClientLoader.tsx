'use client';

import dynamic from 'next/dynamic';

const DashboardClient = dynamic(() => import('./DashboardClient'), {
  ssr: false,
  loading: () => <div className="p-6">Loading dashboard…</div>,
});

export default function DashboardClientLoader() {
  return <DashboardClient />;
} 