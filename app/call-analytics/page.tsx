export const metadata = {
  title: 'Call Analytics | Spoqen',
};

import { Suspense } from 'react';
import CallAnalyticsClientLoader from './CallAnalyticsClientLoader';

export default function CallAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <CallAnalyticsClientLoader />
    </Suspense>
  );
}