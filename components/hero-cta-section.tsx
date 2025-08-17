'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function HeroCTASection() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
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
    </div>
  );
}
