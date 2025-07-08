'use client';

import { useState, useEffect } from 'react';
import { ScarcityBanner } from '@/components/ui/scarcity-banner';

export function ScarcityBannerProvider() {
  const [showScarcityBanner, setShowScarcityBanner] = useState(false);

  useEffect(() => {
    // Show scarcity banner after 15 seconds of engagement
    const scarcityTimer = setTimeout(() => {
      // Only if user has scrolled (indicating engagement)
      if (typeof window !== 'undefined' && window.pageYOffset > 200) {
        setShowScarcityBanner(true);
      }
    }, 15000);

    return () => {
      clearTimeout(scarcityTimer);
    };
  }, []);

  if (!showScarcityBanner) {
    return null;
  }

  return (
    <ScarcityBanner
      type="social_proof"
      message="🔥 47 people signed up in the last hour"
      ctaText="Join Now"
      ctaLink="/signup"
      autoHide={true}
      duration={30000}
    />
  );
}
