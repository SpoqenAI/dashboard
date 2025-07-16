export const metadata = {
  title: 'AI Configuration | Spoqen',
};

import { Suspense } from 'react';
import AIConfigurationClientLoader from './AIConfigurationClientLoader';

export default function AIConfigurationPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <AIConfigurationClientLoader />
    </Suspense>
  );
}
