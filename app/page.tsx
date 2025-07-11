import Link from 'next/link';
import { memo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CheckCircle,
  PhoneCall,
  User,
  Play,
  Zap,
  TrendingUp,
  Shield,
  Clock,
  Target,
} from 'lucide-react';
import { PricingCard } from '@/components/pricing-card';
import { ProblemBanner } from '@/components/ui/problem-banner';
import Logo from '@/components/ui/logo';
import {
  TestimonialsSection,
  MicroTestimonial,
  TestimonialStrip,
} from '@/components/testimonials-section';
import { ExitIntentModal } from '@/components/ui/exit-intent-modal';
import { DashboardPreview } from '@/components/dashboard-preview';

// Client components for progressive enhancement
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { SimpleBackground } from '@/components/simple-background';
import { ScarcityBannerProvider } from '@/components/scarcity-banner-provider';
import { HeroCTASection } from '@/components/hero-cta-section';
import { FinalCTAButtons } from '@/components/final-cta-buttons';

const DynamicTestimonialsSection = dynamic(
  () =>
    import('@/components/testimonials-section').then(mod => ({
      default: mod.TestimonialsSection,
    })),
  {
    loading: () => <div className="h-96 animate-pulse rounded-lg bg-card/20" />,
  }
);

const TrustIndicators = dynamic(
  () =>
    import('@/components/trust-indicators').then(mod => ({
      default: mod.TrustIndicators,
    })),
  {
    loading: () => <div className="h-32 animate-pulse rounded-lg bg-card/20" />,
  }
);

const TrustBadges = dynamic(
  () =>
    import('@/components/trust-indicators').then(mod => ({
      default: mod.TrustBadges,
    })),
  {
    loading: () => <div className="h-16 animate-pulse rounded-lg bg-card/20" />,
  }
);

const ROICalculator = dynamic(
  () =>
    import('@/components/roi-calculator').then(mod => ({
      default: mod.ROICalculator,
    })),
  {
    loading: () => <div className="h-96 animate-pulse rounded-lg bg-card/20" />,
  }
);

const IntegrationsShowcase = dynamic(
  () =>
    import('@/components/integrations-showcase').then(mod => ({
      default: mod.IntegrationsShowcase,
    })),
  {
    loading: () => <div className="h-96 animate-pulse rounded-lg bg-card/20" />,
  }
);

// PERFORMANCE: Heavy interactive components loaded on demand
const InteractiveDemo = dynamic(
  () =>
    import('@/components/interactive-demo').then(mod => ({
      default: mod.InteractiveDemo,
    })),
  {
    loading: () => <div className="h-96 animate-pulse rounded-lg bg-card/20" />,
  }
);

// PERFORMANCE: Memoized components to prevent unnecessary re-renders
const MemoizedFeatureCard = memo(
  ({
    icon,
    title,
    description,
    bullets,
    delay = '0s',
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    bullets?: string[];
    delay?: string;
  }) => (
    <div
      className="hover:shadow-glow-primary/20 group flex animate-slide-up flex-col space-y-6 rounded-xl border border-white/10 bg-card/20 p-6 text-left backdrop-blur-glass transition-all duration-300 hover:scale-105 hover:bg-card/30"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start space-x-4">
        <div className="inline-flex flex-shrink-0 rounded-xl bg-gradient-to-r from-card/50 to-card/80 p-3 text-primary transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="mb-2 text-xl font-semibold">{title}</h3>
          <p className="leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      {bullets && bullets.length > 0 && (
        <ul className="space-y-2 pl-4">
          {bullets.slice(0, 4).map((bullet, index) => (
            <li key={index} className="flex items-start space-x-2 text-sm">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-muted-foreground">{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
);

MemoizedFeatureCard.displayName = 'MemoizedFeatureCard';

const MemoizedTechSpec = memo(
  ({
    icon,
    title,
    description,
  }: {
    icon: string;
    title: string;
    description: string;
  }) => (
    <div className="rounded-lg border border-white/10 bg-card/20 p-4 backdrop-blur-glass">
      <div className="font-semibold text-primary">
        {icon} {title}
      </div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  )
);

MemoizedTechSpec.displayName = 'MemoizedTechSpec';

// PERFORMANCE: Memoized TrustLogoStrip component
const TrustLogoStrip = memo(() => (
  <div className="flex flex-col items-center space-y-3 pt-6">
    <p className="text-sm text-muted-foreground">
      Trusted by 50+ growing businesses
    </p>
    <div className="flex items-center justify-center space-x-6 opacity-60">
      <div className="flex items-center space-x-1 text-xs font-medium text-muted-foreground">
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
        <span>TechFlow Digital</span>
      </div>
      <div className="h-4 w-px bg-white/20"></div>
      <div className="flex items-center space-x-1 text-xs font-medium text-muted-foreground">
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
        <span>CryptoConsult Pro</span>
      </div>
      <div className="h-4 w-px bg-white/20"></div>
      <div className="flex items-center space-x-1 text-xs font-medium text-muted-foreground">
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
        <span>GrowthHack Labs</span>
      </div>
    </div>
  </div>
));

TrustLogoStrip.displayName = 'TrustLogoStrip';

// Server Component - No client-side hooks
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Client-side analytics tracking */}
      <AnalyticsTracker page="landing_page" />

      <main id="main-content" className="flex-1" role="main">
        <SimpleBackground
          variant="hero"
          className="flex min-h-screen w-full items-center justify-center"
        >
          <div className="absolute inset-0 z-0" />
          <section
            className="relative z-10 w-full py-20 pt-32"
            aria-label="Hero section"
          >
            <div className="container px-6">
              <div className="grid items-center gap-12 lg:grid-cols-2">
                {/* Left Content */}
                <div className="animate-fade-in space-y-8">
                  <div className="inline-flex items-center rounded-full border border-white/10 bg-card/20 px-4 py-2 backdrop-blur-glass">
                    <span className="text-sm text-muted-foreground">
                      🚀 Join 2,847+ Founders Using AI
                    </span>
                  </div>

                  <h1 className="text-5xl font-bold leading-tight lg:text-7xl">
                    <span className="bg-gradient-primary bg-clip-text py-[6px] leading-[1.2] text-transparent">
                      Never Miss Another Call with Your Personal AI Agent.
                    </span>
                  </h1>

                  <p className="max-w-lg text-xl leading-relaxed text-muted-foreground">
                    AI receptionist and personal AI agent that captures leads
                    24/7, qualifies prospects instantly, and syncs with your
                    CRM—so you never lose revenue to missed calls again.
                  </p>

                  <div className="mb-6 flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/20 px-3 py-1 text-sm backdrop-blur-glass">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>24/7 Lead Capture</span>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/20 px-3 py-1 text-sm backdrop-blur-glass">
                      <TrendingUp className="h-4 w-4 text-accent" />
                      <span>10X ROI Guarantee</span>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-secondary/30 bg-secondary/20 px-3 py-1 text-sm backdrop-blur-glass">
                      <Shield className="h-4 w-4 text-secondary" />
                      <span>API-First Integration</span>
                    </div>
                  </div>

                  {/* Progressive enhancement: CTA buttons with tracking */}
                  <HeroCTASection />

                  <div className="text-sm text-muted-foreground">
                    No credit card • Setup in 5 min • Cancel anytime
                  </div>

                  <TrustLogoStrip />

                  <div className="flex items-center space-x-8 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        340%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg ROI
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">24/7</div>
                      <div className="text-sm text-muted-foreground">
                        Available
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">
                        99.9%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Uptime
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Content - Live Dashboard Preview */}
                <div
                  className="relative animate-slide-up"
                  style={{ animationDelay: '0.3s' }}
                >
                  <DashboardPreview />
                </div>
              </div>
            </div>
          </section>
        </SimpleBackground>

        {/* PERFORMANCE: Lazy load below-the-fold sections */}
        <Suspense fallback={<div className="h-32 animate-pulse bg-card/20" />}>
          <TrustIndicators />
        </Suspense>

        <Suspense fallback={<div className="h-96 animate-pulse bg-card/20" />}>
          <DynamicTestimonialsSection />
        </Suspense>

        <Suspense fallback={<div className="h-96 animate-pulse bg-card/20" />}>
          <InteractiveDemo />
        </Suspense>

        {/* Micro-testimonial after Interactive Demo */}
        <div className="py-8">
          <div className="container px-6">
            <div className="mx-auto max-w-2xl">
              <MicroTestimonial index={2} />
            </div>
          </div>
        </div>

        <SimpleBackground
          variant="features"
          className="bg-gradient-to-b from-background to-card/30 py-20"
        >
          <section id="features" className="w-full">
            <div className="container px-6">
              {/* Problem Banner */}
              <div className="mb-16 animate-fade-in">
                <ProblemBanner />
              </div>

              <div className="mb-16 animate-fade-in text-center">
                <h2 className="mb-6 text-4xl font-bold lg:text-5xl">
                  Stop Losing Revenue to
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    {' '}
                    Missed Opportunities
                  </span>
                </h2>
                <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
                  Spoqen captures every call, qualifies every prospect, and
                  converts every opportunity— so you never lose another deal to
                  poor timing or availability.
                </p>
              </div>

              <div className="mx-auto mb-16 grid max-w-6xl gap-8 lg:grid-cols-2">
                <MemoizedFeatureCard
                  icon={<Target className="h-7 w-7" />}
                  title="Know Why They Called—Before Calling Back"
                  description="Stop playing phone tag. Get instant call summaries with intent, budget, timeline, and next steps."
                  bullets={[
                    'Lead qualification in real-time during the call',
                    'Complete conversation summary sent instantly',
                    'Priority scoring so you call hot leads first',
                    'Integration with your existing CRM workflow',
                  ]}
                />
                <MemoizedFeatureCard
                  icon={<Clock className="h-7 w-7" />}
                  title="Turn Missed Calls Into Closed Deals"
                  description="Never lose a prospect to timing. Our AI handles objections, books appointments, and nurtures leads 24/7."
                  bullets={[
                    'Professional call handling that builds trust',
                    'Appointment booking directly to your calendar',
                    "Follow-up sequences for prospects who aren't ready",
                    'Escalation protocols for high-value opportunities',
                  ]}
                  delay="0.1s"
                />
                <MemoizedFeatureCard
                  icon={<Zap className="h-7 w-7" />}
                  title="Get Notified The Moment Opportunities Hit"
                  description="Hot leads don't wait. Get instant notifications with complete context so you can strike while interest is high."
                  bullets={[
                    'Real-time Slack/email alerts for qualified leads',
                    'Lead scoring based on buying signals',
                    'Automatic CRM updates with conversation data',
                    'Custom triggers for your specific business',
                  ]}
                  delay="0.2s"
                />
                <MemoizedFeatureCard
                  icon={<TrendingUp className="h-7 w-7" />}
                  title="Scale Revenue Without Scaling Headcount"
                  description="Handle 10X more calls without hiring more staff. Perfect call handling, every time, at any volume."
                  bullets={[
                    'Unlimited concurrent call capacity',
                    'Consistent qualification process for every lead',
                    'No sick days, breaks, or training costs',
                    'Scales instantly during marketing campaigns',
                  ]}
                  delay="0.3s"
                />
              </div>

              {/* Technical Specs for Tech Founders */}
              <div className="text-center">
                <h3 className="mb-8 text-2xl font-bold">
                  Effortless Business Integration:
                </h3>
                <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <MemoizedTechSpec
                    icon="🔗"
                    title="Instant Setup"
                    description="Connect in minutes"
                  />
                  <MemoizedTechSpec
                    icon="⚡"
                    title="Real-Time Alerts"
                    description="SMS & Email"
                  />
                  <MemoizedTechSpec
                    icon="🔒"
                    title="Enterprise-Grade Security"
                    description="SOC2 & GDPR"
                  />
                  <MemoizedTechSpec
                    icon="📊"
                    title="Actionable Insights"
                    description="Caller trends"
                  />
                  <MemoizedTechSpec
                    icon="🚀"
                    title="Scales With You"
                    description="Auto-scaling"
                  />
                </div>
              </div>
            </div>
          </section>
        </SimpleBackground>

        {/* More sections with lazy loading... */}
        <Suspense fallback={<div className="h-96 animate-pulse bg-card/20" />}>
          <ROICalculator />
        </Suspense>

        <Suspense fallback={<div className="h-96 animate-pulse bg-card/20" />}>
          <IntegrationsShowcase />
        </Suspense>

        {/* Pricing Section */}
        <SimpleBackground
          variant="minimal"
          className="bg-gradient-to-b from-card/30 to-background py-20"
        >
          <section id="pricing" className="w-full">
            <div className="container px-6">
              <div className="mb-16 text-center">
                <h2 className="mb-6 text-4xl font-bold lg:text-5xl">
                  Simple Pricing,
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    {' '}
                    Maximum ROI
                  </span>
                </h2>
                <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
                  Built for founders who understand the value of time. One plan,
                  unlimited possibilities.
                </p>
              </div>

              <div className="flex justify-center">
                <PricingCard />
              </div>
            </div>
          </section>
        </SimpleBackground>

        {/* Testimonial Strip after Pricing */}
        <TestimonialStrip />

        {/* Final CTA */}
        <section className="w-full bg-gradient-to-b from-background to-card/30 py-20">
          <div className="container px-6">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="mb-6 text-4xl font-bold lg:text-5xl">
                Ready to Scale Your Revenue?
              </h2>
              <p className="mb-8 text-xl text-muted-foreground">
                Join 2,847+ founders who are already using Spoqen to capture
                every lead and scale without limits.
              </p>

              {/* Progressive enhancement: Final CTA buttons with tracking */}
              <FinalCTAButtons />

              <Suspense
                fallback={
                  <div className="h-16 animate-pulse rounded-lg bg-card/20" />
                }
              >
                <TrustBadges />
              </Suspense>
            </div>
          </div>
        </section>
      </main>

      {/* Progressive enhancement: Scarcity banner */}
      <ScarcityBannerProvider />

      {/* PERSUASION: Exit intent modal */}
      <ExitIntentModal
        title="Wait! Don't Miss Out"
        subtitle="Before you go, grab this exclusive offer"
        offer="50% OFF"
        ctaText="Claim My Discount"
        ctaLink="/signup?discount=50"
        incentive="Join 2,847+ founders already using Spoqen"
      />
    </div>
  );
}
