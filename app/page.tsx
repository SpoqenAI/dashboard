import { Suspense } from 'react';
import Link from 'next/link';
import { SimpleBackground } from '@/components/simple-background';
import { HeroCTASection } from '@/components/hero-cta-section';
import { InteractiveDemo } from '@/components/interactive-demo';
import { IntegrationsShowcase } from '@/components/integrations-showcase';
import { ROICalculator } from '@/components/roi-calculator';
import { FinalCTAButtons } from '@/components/final-cta-buttons';
import { BenefitsBar } from '@/components/benefits-bar';
import { BenefitsGrid } from '@/components/features/benefits-grid';
import { PhoneLottie } from '@/components/phone-lottie';
import { FeatureGuideRail } from '@/components/feature-guide-rail';
import { Button } from '@/components/ui/button';
import {
  MotionHover,
  MotionItem,
  MotionPageLoad,
  MotionReveal,
  MotionStagger,
} from '@/components/motion';

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
              <MotionPageLoad className="mx-auto max-w-3xl text-center">
                <MotionItem>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-6xl">
                    Simplify Complex Voice AI Flows
                  </h1>
                </MotionItem>
                <MotionItem>
                  <div className="mt-4 sm:mt-6">
                    <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-3xl lg:text-6xl">
                      The All-in-One Prompt Building Platform.
                    </span>
                  </div>
                </MotionItem>
                <MotionItem>
                  <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground sm:mt-5">
                    Build, test, and deploy intricate prompt graphs visually. We
                    simplify the hardest parts of conversational AI design so
                    you can launch reliable voice agents faster.
                  </p>
                </MotionItem>
                <MotionItem>
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
                </MotionItem>
              </MotionPageLoad>
              <MotionReveal className="mt-10" delay={0.15}>
                <BenefitsBar />
              </MotionReveal>
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
                <MotionStagger
                  inView
                  data-feature-row
                  className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2"
                >
                  <MotionItem direction="up" className="order-2 md:order-1">
                    <h2
                      id="save-time-heading"
                      className="text-3xl font-bold tracking-tight sm:text-4xl"
                    >
                      Intuitive Node-Based Design
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                      Stop wrestling with massive text files. Build complex conversation
                      trees visually. Connect steps logically, manage states clearly,
                      and understand exactly what your agent will say at any point.
                    </p>
                  </MotionItem>
                  <MotionItem
                    direction="right"
                    data-anim
                    className="order-1 mx-auto w-full max-w-md md:order-2"
                  >
                    <PhoneLottie
                      src="/animations/Meetings.json"
                      tintStrength={0.7}
                      tintMode="full"
                    />
                  </MotionItem>
                </MotionStagger>
              </div>
            </section>

            {/* Setup & Call Forwarding section (moved below and flipped) */}
            <section className="py-12">
              <div className="container px-6">
                <MotionStagger
                  inView
                  data-feature-row
                  className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2"
                >
                  <MotionItem
                    direction="left"
                    data-anim
                    className="order-1 mx-auto w-full max-w-md md:order-1"
                  >
                    <PhoneLottie
                      src="/animations/Number Phone icon.json"
                      tint
                      tintMode="full"
                      tintStrength={0.85}
                    />
                  </MotionItem>
                  <MotionItem
                    direction="up"
                    className="order-2 md:order-2 md:pl-8"
                  >
                    <h2
                      id="keep-number-heading"
                      className="text-3xl font-bold tracking-tight sm:text-4xl"
                    >
                      Robust Testing and Validation
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                      Identify dead ends and logic loops before deployment.
                      Simulate conversations safely in the builder, ensuring your
                      prompts are resilient and handle off-script user behavior natively.
                    </p>
                    <ul className="mt-6 space-y-2 text-left text-muted-foreground">
                      <li>• Real-time syntax and flow validation</li>
                      <li>• Simulated transcript debugging</li>
                      <li>• Seamless export to major agent runtimes</li>
                    </ul>
                  </MotionItem>
                </MotionStagger>
              </div>
            </section>

            {/* Always-on Answering section */}
            <section className="py-12">
              <div className="container px-6">
                <MotionStagger
                  inView
                  data-feature-row
                  className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2"
                >
                  <MotionItem direction="up" className="order-2 md:order-1">
                    <h2
                      id="always-on-heading"
                      className="text-3xl font-bold tracking-tight sm:text-4xl"
                    >
                      Deploy with Confidence
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                      Export clean, structured prompt configurations instantly.
                      Manage versions, track changes, and collaborate with your team.
                      Prompt iteration goes from a messy guessing game to a reliable engineering process.
                    </p>
                    <ul className="mt-6 space-y-2 text-left text-muted-foreground">
                      <li>• Centralized prompt version control</li>
                      <li>• One-click export formats</li>
                      <li>• Built-in collaboration for prompt engineers</li>
                    </ul>
                  </MotionItem>
                  <MotionItem
                    direction="right"
                    data-anim
                    className="order-1 mx-auto w-full max-w-md md:order-2"
                  >
                    <PhoneLottie
                      src="/animations/Sharing content on social media.json"
                      tint
                      tintMode="full"
                      tintStrength={0.8}
                    />
                  </MotionItem>
                </MotionStagger>
              </div>
            </section>
          </div>

          {/* Solution (Interactive Demo) */}
          <section id="solution">
            <Suspense fallback={<div className="h-96" />}>
              <MotionReveal>
                <InteractiveDemo />
              </MotionReveal>
            </Suspense>
          </section>

          {/* Benefits (Features & ROI) */}
          <section id="features" className="py-20">
            <MotionReveal>
              <BenefitsGrid />
            </MotionReveal>
          </section>

          <section id="roi" className="relative py-24">
            <div className="container px-6">
              <Suspense fallback={<div className="h-96" />}>
                <MotionReveal>
                  <ROICalculator />
                </MotionReveal>
              </Suspense>
            </div>
          </section>

          {/* Trust & Integration */}
          <section className="py-20">
            <Suspense fallback={<div className="h-96" />}>
              <MotionReveal>
                <IntegrationsShowcase />
              </MotionReveal>
            </Suspense>
          </section>

          {/* Custom / Enterprise Pricing */}
          <section id="pricing" className="py-20">
            <div className="container px-6">
              <MotionStagger
                inView
                className="mx-auto max-w-3xl space-y-6 text-center"
              >
                <MotionItem>
                  <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
                    Scale your prompt engineering
                  </h2>
                </MotionItem>
                <MotionItem>
                  <p className="text-xl text-muted-foreground">
                    From solo builders to enterprise voice AI teams needing collaboration, versioning, and dedicated support. Bring your most complex logic, we simplify the rest.
                  </p>
                </MotionItem>
                <MotionItem>
                  <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Button asChild size="lg">
                      <Link href="/contact">Talk to sales</Link>
                    </Button>
                  </div>
                </MotionItem>
              </MotionStagger>

              <MotionStagger
                inView
                className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                <MotionItem>
                  <MotionHover className="h-full">
                    <div className="hover:shadow-glow-primary/20 h-full rounded-2xl border bg-card/60 p-6 text-left shadow-sm transition-shadow duration-300">
                      <h3 className="text-xl font-semibold">
                        Built for complexity
                      </h3>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Handle multi-turn flows, dynamic variables, and complex branching without writing code.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <li>• Visual node-based workflow</li>
                        <li>• Advanced state management</li>
                        <li>• Native variable mapping</li>
                      </ul>
                    </div>
                  </MotionHover>
                </MotionItem>
                <MotionItem>
                  <MotionHover className="h-full">
                    <div className="hover:shadow-glow-primary/20 h-full rounded-2xl border bg-card/60 p-6 text-left shadow-sm transition-shadow duration-300">
                      <h3 className="text-xl font-semibold">
                        Enterprise controls
                      </h3>
                      <p className="mt-3 text-sm text-muted-foreground">
                        SSO, RBAC, IP allowlists, secrets vault, and data
                        handling that meets enterprise needs.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <li>• RBAC and SSO</li>
                        <li>• IP allowlists and network controls</li>
                        <li>• Vaulted secrets and audit logs</li>
                      </ul>
                    </div>
                  </MotionHover>
                </MotionItem>
                <MotionItem>
                  <MotionHover className="h-full">
                    <div className="hover:shadow-glow-primary/20 h-full rounded-2xl border bg-card/60 p-6 text-left shadow-sm transition-shadow duration-300">
                      <h3 className="text-xl font-semibold">Expert support</h3>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Prompt optimization reviews, advanced architecture guidance, and specialized onboarding.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <li>• Best practice prompt templates</li>
                        <li>• Export and runtime integrations</li>
                        <li>• Dedicated prompt engineering experts</li>
                      </ul>
                    </div>
                  </MotionHover>
                </MotionItem>
              </MotionStagger>
            </div>
          </section>

          {/* Final CTA */}
          <section id="help" className="py-20">
            <div className="container px-6 text-center">
              <MotionStagger inView className="mx-auto max-w-3xl space-y-8">
                <MotionItem>
                  <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
                    Ready to build better voice agents?
                  </h2>
                </MotionItem>
                <MotionItem>
                  <p className="text-xl text-muted-foreground">
                    Start crafting complex, robust prompt graphs visually and deploy them in seconds.
                  </p>
                </MotionItem>
                <MotionItem>
                  <FinalCTAButtons />
                </MotionItem>
              </MotionStagger>
            </div>
          </section>
        </main>
      </SimpleBackground>

      {/* Dynamic Components */}
      <Suspense fallback={null}>
        {/* Dynamic components can be added here */}
      </Suspense>
    </>
  );
}
