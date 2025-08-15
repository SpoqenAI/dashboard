import { Suspense } from 'react';
import Image from 'next/image';
import { SimpleBackground } from '@/components/simple-background';
import { HeroCTASection } from '@/components/hero-cta-section';
import { ProblemBanner } from '@/components/ui/problem-banner';
import { InteractiveDemo } from '@/components/interactive-demo';
import { PricingGrid } from '@/app/pricing/components/pricing-grid';
import {
  BillingToggle,
  BillingProvider,
} from '@/app/pricing/components/billing-toggle';
import { pricingTiers } from '@/app/pricing/page';
// Removed testimonials and trust indicators
import { IntegrationsShowcase } from '@/components/integrations-showcase';
import { ROICalculator } from '@/components/roi-calculator';
import { FinalCTAButtons } from '@/components/final-cta-buttons';
import { ScarcityBannerProvider } from '@/components/scarcity-banner-provider';
import ExitIntentModalLoader from '@/components/ui/exit-intent-modal-loader';
// Removed static incoming call component per rebrand
import { BenefitsBar } from '@/components/benefits-bar';
import { BenefitsGrid } from '@/components/features/benefits-grid';

export default function HomePage() {
  return (
    <BillingProvider>
      <SimpleBackground variant="heroV2" className="relative overflow-hidden">
        {/* Tiled background of subtle icons across full page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 overflow-hidden"
        >
          <div className="absolute inset-0 opacity-[0.03] [background-image:url('/Icon.svg')] [background-repeat:repeat] [background-size:96px] sm:opacity-[0.035] sm:[background-size:128px] md:opacity-[0.04] md:[background-size:160px]" />
        </div>

        <main id="main-content" className="relative z-10 min-h-screen">
          {/* Hero Section (Option A: split hero, subtle gradient) */}
          <section>
            <div className="container px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
              <div className="mx-auto max-w-4xl text-center">
                <h1 className="whitespace-nowrap text-3xl font-bold tracking-tight sm:text-4xl lg:text-6xl">
                  Tired of answering calls all day?
                </h1>
                <div className="mt-4 sm:mt-6">
                  <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-7xl">
                    We got you covered.
                  </span>
                </div>
                <div className="mt-6 flex justify-center">
                  <HeroCTASection />
                </div>
              </div>
              <div className="mt-10">
                <BenefitsBar />
              </div>
            </div>
          </section>

          {/* Problem Banner */}
          <section className="py-12">
            <div className="container px-6">
              <ProblemBanner />
            </div>
          </section>

          {/* Solution (Interactive Demo) */}
          <section id="solution">
            <Suspense fallback={<div className="h-96" />}>
              <InteractiveDemo />
            </Suspense>
          </section>

          {/* Benefits (Features & ROI) */}
          <section id="features" className="py-20">
            <BenefitsGrid />
          </section>

          <section id="roi" className="py-20">
            <Suspense fallback={<div className="h-96" />}>
              <ROICalculator />
            </Suspense>
          </section>

          {/* Trust & Integration */}
          <section className="py-20">
            <Suspense fallback={<div className="h-96" />}>
              <IntegrationsShowcase />
            </Suspense>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="py-20">
            <div className="container px-6">
              <div className="mb-16 text-center">
                <h2 className="mb-6 text-4xl font-bold tracking-tight lg:text-5xl">
                  Simple, Transparent Pricing
                </h2>
                <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
                  Choose the perfect plan for your business. Start free, upgrade
                  when you're ready.
                </p>
                {/* Billing Toggle */}
                <div className="pt-10 sm:pt-12 md:pt-14 lg:pt-16">
                  <BillingToggle />
                </div>
              </div>
              <Suspense fallback={<div className="h-96" />}>
                <PricingGrid pricingTiers={pricingTiers} />
              </Suspense>
            </div>
          </section>

          {/* Testimonials section removed - no real reviews yet */}

          {/* Final CTA */}
          <section id="help" className="py-20">
            <div className="container px-6 text-center">
              <div className="mx-auto max-w-3xl space-y-8">
                <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
                  Ready to Stop Missing Calls?
                </h2>
                <p className="text-xl text-muted-foreground">
                  Start capturing every opportunity with AI-powered call
                  handling.
                </p>
                <FinalCTAButtons />
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    No credit card required
                  </span>{' '}
                  • 14-day free trial • Cancel anytime
                </div>
              </div>
            </div>
          </section>
        </main>
      </SimpleBackground>

      {/* Dynamic Components */}
      <Suspense fallback={null}>
        <ScarcityBannerProvider />
      </Suspense>

      <Suspense fallback={null}>
        <ExitIntentModalLoader />
      </Suspense>
    </BillingProvider>
  );
}
