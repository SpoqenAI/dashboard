'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function FinalCTAButtons() {
  return (
    <div className="mb-8 flex flex-col justify-center gap-4 sm:flex-row">
      <Button
        variant="neon"
        size="xl"
        className="focus-visible-ring group"
        asChild
      >
        <Link href="/contact">
          See it in action
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
        asChild
      >
        <Link href="/#solution">How it works</Link>
      </Button>
    </div>
  );
}
