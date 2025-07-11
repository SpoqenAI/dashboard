'use client';

import { useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

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
  const handleVideoEvent = useCallback(() => {}, []);

  const openDemoVideo = useCallback(() => {
    setIsDemoVideoOpen(true);
  }, []);

  const closeDemoVideo = useCallback(() => {
    setIsDemoVideoOpen(false);
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
            onClick={() => undefined}
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
          <span className="ml-2 text-xs opacity-75" aria-hidden="true">
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
