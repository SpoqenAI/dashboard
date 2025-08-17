import { Suspense } from 'react';
import Image from 'next/image';
import { SimpleBackground } from '@/components/simple-background';
import { HeroCTASection } from '@/components/hero-cta-section';
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
import { PhoneLottie } from '@/components/phone-lottie';
import { FeatureGuideRail } from '@/components/feature-guide-rail';

export default function HomePage() {
  return (
    <>
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
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-6xl">
                  Tired of answering calls all day?
                </h1>
                <div className="mt-4 sm:mt-6">
                  <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-3xl lg:text-7xl">
                    We got you covered.
                  </span>
                </div>
                <div className="mt-6 flex items-center justify-center gap-3 sm:gap-4">
                  <HeroCTASection />
                  <div
                    className="hidden h-14 w-14 items-center sm:flex"
                    aria-hidden
                  >
                    <PhoneLottie
                      src="/animations/Call.json"
                      height={56}
                      tintStrength={1}
                      tintMode="full"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <BenefitsBar />
              </div>
            </div>
          </section>

          {/* Feature trio wrapper with central guide rail */}
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="container relative mx-auto h-full px-6">
                <FeatureGuideRail
                  anchors={[
                    { side: 'right', id: 'save-time-heading' },
                    { side: 'left', id: 'keep-number-heading' },
                    { side: 'right', id: 'always-on-heading' },
                  ]}
                  className="absolute inset-0 hidden text-primary sm:block"
                  endBeforeId="solution"
                  endOffset={24}
                  strokeWidth={2}
                />
              </div>
            </div>

            {/* Save time with your AI phone assistant */}
            <section className="py-12">
              <div className="container px-6">
                <div
                  data-feature-row
                  className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2"
                >
                  <div className="order-2 md:order-1">
                    <h2
                      id="save-time-heading"
                      className="text-3xl font-bold tracking-tight sm:text-4xl"
                    >
                      Save time with your AI phone assistant
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                      Let your assistant answer, qualify and summarize calls so
                      you can get back to the work that matters. Meetings are
                      scheduled, notes are emailed, and your CRM stays
                      up-to-date—automatically.
                    </p>
                  </div>
                  <div
                    data-anim
                    className="order-1 mx-auto w-full max-w-md md:order-2"
                  >
                    <PhoneLottie
                      src="/animations/Meetings.json"
                      tintStrength={0.7}
                      tintMode="full"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Setup & Call Forwarding section (moved below and flipped) */}
            <section className="py-12">
              <div className="container px-6">
                <div
                  data-feature-row
                  className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2"
                >
                  <div
                    data-anim
                    className="order-1 mx-auto w-full max-w-md md:order-1"
                  >
                    <PhoneLottie
                      src="/animations/Number Phone icon.json"
                      tint
                      tintMode="full"
                      tintStrength={0.85}
                    />
                  </div>
                  <div className="order-2 md:order-2 md:pl-8">
                    <h2
                      id="keep-number-heading"
                      className="text-3xl font-bold tracking-tight sm:text-4xl"
                    >
                      Keep your number. Forward calls in minutes.
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                      Point your existing phone number to your AI assistant with
                      simple call forwarding. No new hardware, no porting
                      required—just turn it on and let us answer.
                    </p>
                    <ul className="mt-6 space-y-2 text-left text-muted-foreground">
                      <li>• Keep your business number</li>
                      <li>• Instant setup with your carrier</li>
                      <li>• Seamless handoff back to you when needed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Always-on Answering section */}
            <section className="py-12">
              <div className="container px-6">
                <div
                  data-feature-row
                  className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2"
                >
                  <div className="order-2 md:order-1">
                    <h2
                      id="always-on-heading"
                      className="text-3xl font-bold tracking-tight sm:text-4xl"
                    >
                      Always-on answering, even when you can’t pick up
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                      Whether you’re on a flight, your phone is dead, or you
                      just don’t want to take the call, your agent still
                      answers, qualifies, and follows up—so you never miss a
                      thing.
                    </p>
                    <ul className="mt-6 space-y-2 text-left text-muted-foreground">
                      <li>• Answers 24/7 in your brand voice</li>
                      <li>• Captures messages and next steps</li>
                      <li>• Schedules callbacks and sends summaries</li>
                    </ul>
                  </div>
                  <div
                    data-anim
                    className="order-1 mx-auto w-full max-w-md md:order-2"
                  >
                    <PhoneLottie
                      src="/animations/Sharing content on social media.json"
                      tint
                      tintMode="full"
                      tintStrength={0.8}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

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

          <section id="roi" className="relative py-24">
            <div className="container px-6">
              <Suspense fallback={<div className="h-96" />}>
                <ROICalculator />
              </Suspense>
            </div>
          </section>

          {/* Trust & Integration */}
          <section className="py-20">
            <Suspense fallback={<div className="h-96" />}>
              <IntegrationsShowcase />
            </Suspense>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="py-20">
            <BillingProvider>
              <div className="container px-6">
                <div className="mb-16 text-center">
                  <h2 className="mb-6 text-4xl font-bold tracking-tight lg:text-5xl">
                    Simple, Transparent Pricing
                  </h2>
                  <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
                    Choose the perfect plan for your business. Start free,
                    upgrade when you're ready.
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
            </BillingProvider>
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
    </>
  );
}
