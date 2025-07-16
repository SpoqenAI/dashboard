'use client';

import dynamic from 'next/dynamic';

const AIConfigurationClient = dynamic(() => import('./AIConfigurationClient'), {
  ssr: false,
  loading: () => <div className="p-6">Loading AI configuration…</div>,
});

export default function AIConfigurationClientLoader() {
  return <AIConfigurationClient />;
}