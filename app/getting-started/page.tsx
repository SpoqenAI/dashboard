export const metadata = {
  title: 'Getting Started | Spoqen',
};

import { Suspense } from 'react';
import GettingStartedClient from './GettingStartedClient';

export default function GettingStartedPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <GettingStartedClient />
    </Suspense>
  );
}
