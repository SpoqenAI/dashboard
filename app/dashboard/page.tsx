export const metadata = {
  title: 'Dashboard | Spoqen',
};

import { Suspense } from 'react';
import DashboardClientLoader from './DashboardClientLoader';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <DashboardClientLoader />
    </Suspense>
  );
}
