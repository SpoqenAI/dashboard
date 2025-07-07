'use client';

import { useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { trackCTA, trackEvent } from '@/lib/analytics-tracking';

// Dynamically import the modal to avoid SSR issues
const DemoVideoModal = dynamic(
  () =>
    import('@/components/demo-video-modal').then(mod => ({
      default: mod.DemoVideoModal,
    })),
  {
    loading: () => null,
    ssr: false,
  }
);

export function HeroCTASection() {
  const [isDemoVideoOpen, setIsDemoVideoOpen] = useState(false);

  // Memoized event handlers to prevent re-renders
  const handleVideoEvent = useCallback((event: string, data?: any) => {
    trackEvent('video_interaction', { action: event, ...data });
  }, []);

  const openDemoVideo = useCallback(() => {
    setIsDemoVideoOpen(true);
    trackCTA('demo_video', 'hero_section', { position: 'secondary' });
  }, []);

  const closeDemoVideo = useCallback(() => {
    setIsDemoVideoOpen(false);
    trackEvent('demo_video_closed', {
      duration: Date.now() - (window as any).demoStartTime,
    });
  }, []);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          variant="neon"
          size="xl"
          className="focus-visible-ring group"
          asChild
        >
          <Link
            href="/signup"
            aria-label="Start your 14-day free trial"
            onClick={() =>
              trackCTA('start_trial', 'hero_section', {
                position: 'primary',
              })
            }
          >
            Start Free Trial
            <ArrowRight
              className="transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="xl"
          className="focus-visible-ring group border-white/20 hover:bg-white/10"
          onClick={openDemoVideo}
          aria-label="Watch product demo video, 2 minutes long"
        >
          <Play className="mr-2" aria-hidden="true" />
          Watch Demo
          <span
            className="ml-2 text-xs opacity-75"
            aria-hidden="true"
          >
            2 min
          </span>
        </Button>
      </div>
      
      {/* Demo video modal loaded on demand */}
      <Suspense fallback={null}>
        <DemoVideoModal
          isOpen={isDemoVideoOpen}
          onClose={closeDemoVideo}
          onVideoEvent={handleVideoEvent}
        />
      </Suspense>
    </>
  );
} 