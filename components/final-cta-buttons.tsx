'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { trackCTA } from '@/lib/analytics-tracking';

export function FinalCTAButtons() {
  return (
    <div className="mb-8 flex flex-col justify-center gap-4 sm:flex-row">
      <Button
        variant="neon"
        size="xl"
        className="focus-visible-ring group"
        asChild
      >
        <Link
          href="/signup"
          onClick={() =>
            trackCTA('start_trial', 'final_cta', {
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
        className="focus-visible-ring"
        onClick={() =>
          trackCTA('book_demo', 'final_cta', {
            position: 'secondary',
          })
        }
      >
        Book a Demo Call
      </Button>
    </div>
  );
} 