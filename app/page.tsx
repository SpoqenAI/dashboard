import { Suspense } from 'react';
import { SimpleBackground } from '@/components/simple-background';
import { HeroCTASection } from '@/components/hero-cta-section';
import { ProblemBanner } from '@/components/ui/problem-banner';
import { InteractiveDemo } from '@/components/interactive-demo';
import { PricingCard } from '@/components/pricing-card';
// Removed testimonials and trust indicators
import { IntegrationsShowcase } from '@/components/integrations-showcase';
import { ROICalculator } from '@/components/roi-calculator';
import { FinalCTAButtons } from '@/components/final-cta-buttons';
import { ScarcityBannerProvider } from '@/components/scarcity-banner-provider';
import ExitIntentModalLoader from '@/components/ui/exit-intent-modal-loader';

export default function HomePage() {
  return (
    <>
      <main id="main-content" className="min-h-screen">
        {/* Hero Section */}
        <SimpleBackground variant="hero" className="relative overflow-hidden">
          <div className="container relative z-10 px-6 py-20 text-center lg:py-32">
            {/* Main Hero Content */}
            <div className="mx-auto max-w-4xl space-y-8">
              {/* Main Headlines */}
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                  <span className="block text-foreground">
                    Tired of Missing Calls?
                  </span>
                  <span className="block bg-gradient-primary bg-clip-text text-transparent">
                    We've Got You Covered
                  </span>
                </h1>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl lg:text-2xl">
                  Your all-in-one AI receptionist, assistant, and phone call
                  lifeline.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex justify-center">
                <HeroCTASection />
              </div>

              {/* Trust indicators removed - no fake data */}
            </div>
          </div>
        </SimpleBackground>

        {/* Problem Banner */}
        <section className="py-12">
          <div className="container px-6">
            <ProblemBanner />
          </div>
        </section>

        {/* Interactive Demo */}
        <section id="features">
          <Suspense fallback={<div className="h-96" />}>
            <InteractiveDemo />
          </Suspense>
        </section>

        {/* Integrations Showcase */}
        <section className="py-20">
          <Suspense fallback={<div className="h-96" />}>
            <IntegrationsShowcase />
          </Suspense>
        </section>

        {/* ROI Calculator */}
        <section className="py-20">
          <Suspense fallback={<div className="h-96" />}>
            <ROICalculator />
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
            </div>
            <Suspense fallback={<div className="h-96" />}>
              <PricingCard />
            </Suspense>
          </div>
        </section>

        {/* Testimonials section removed - no real reviews yet */}

        {/* Final CTA */}
        <section
          id="help"
          className="bg-gradient-to-b from-background to-card/30 py-20"
        >
          <div className="container px-6 text-center">
            <div className="mx-auto max-w-3xl space-y-8">
              <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
                Ready to Stop Missing Calls?
              </h2>
              <p className="text-xl text-muted-foreground">
                Start capturing every opportunity with AI-powered call handling.
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
