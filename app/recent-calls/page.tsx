export const metadata = {
  title: 'Recent Calls | Spoqen',
};

import { Suspense } from 'react';
import RecentCallsClientLoader from './RecentCallsClientLoader';

export default function RecentCallsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <RecentCallsClientLoader />
    </Suspense>
  );
}