'use client';

import dynamic from 'next/dynamic';

const ExitIntentModal = dynamic(() => import('./exit-intent-modal').then(m => m.ExitIntentModal), {
  ssr: false,
});

export default function ExitIntentModalLoader() {
  return (
    <ExitIntentModal
      title="Wait! Don't Miss Out"
      subtitle="Before you go, grab this exclusive offer"
      offer="50% OFF"
      ctaText="Claim My Discount"
      ctaLink="/signup?discount=50"
      incentive="Join 2,847+ founders already using Spoqen"
    />
  );
} 