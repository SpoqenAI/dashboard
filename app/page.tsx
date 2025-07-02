'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback, memo, Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { initializeAnalytics, trackEvent, trackCTA, trackConversion } from '@/lib/analytics-tracking';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, PhoneCall, User, Play, Zap, TrendingUp, Shield, Clock, Target } from 'lucide-react';
import { PricingCard } from '@/components/pricing-card';
import { ProblemBanner } from '@/components/ui/problem-banner';
import Logo from '@/components/ui/logo';
import { TestimonialsSection, MicroTestimonial, TestimonialStrip } from '@/components/testimonials-section';
import { ScarcityBanner } from '@/components/ui/scarcity-banner';
import { ExitIntentModal } from '@/components/ui/exit-intent-modal';

// PERFORMANCE: Dynamic imports with lazy loading for heavy components
const InteractiveBackground = dynamic(
  () => import('@/components/interactive-background').then(mod => ({ default: mod.InteractiveBackground })),
  {
    loading: () => <div className="min-h-screen bg-gradient-dark" />,
    ssr: false,
  }
);

// PERFORMANCE: Load InteractiveBackground only when appropriate for better LCP
const OptimizedInteractiveBackground = dynamic(
  () => import('@/components/interactive-background').then(mod => ({ default: mod.InteractiveBackground })),
  {
    loading: () => <div className="min-h-screen bg-gradient-dark bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,155,240,0.1),rgba(255,255,255,0))] bg-[radial-gradient(ellipse_60%_80%_at_20%_40%,rgba(139,92,246,0.1),transparent)]" />,
    ssr: false,
  }
);

const DynamicTestimonialsSection = dynamic(
  () => import('@/components/testimonials-section').then(mod => ({ default: mod.TestimonialsSection })),
  {
    loading: () => <div className="h-96 bg-card/20 animate-pulse rounded-lg" />,
  }
);

const TrustIndicators = dynamic(
  () => import('@/components/trust-indicators').then(mod => ({ default: mod.TrustIndicators })),
  {
    loading: () => <div className="h-32 bg-card/20 animate-pulse rounded-lg" />,
  }
);

const TrustBadges = dynamic(
  () => import('@/components/trust-indicators').then(mod => ({ default: mod.TrustBadges })),
  {
    loading: () => <div className="h-16 bg-card/20 animate-pulse rounded-lg" />,
  }
);

const ROICalculator = dynamic(
  () => import('@/components/roi-calculator').then(mod => ({ default: mod.ROICalculator })),
  {
    loading: () => <div className="h-96 bg-card/20 animate-pulse rounded-lg" />,
  }
);

const IntegrationsShowcase = dynamic(
  () => import('@/components/integrations-showcase').then(mod => ({ default: mod.IntegrationsShowcase })),
  {
    loading: () => <div className="h-96 bg-card/20 animate-pulse rounded-lg" />,
  }
);

// PERFORMANCE: Heavy interactive components loaded on demand
const InteractiveDemo = dynamic(
  () => import('@/components/interactive-demo').then(mod => ({ default: mod.InteractiveDemo })),
  {
    loading: () => <div className="h-96 bg-card/20 animate-pulse rounded-lg" />,
  }
);

const DemoVideoModal = dynamic(
  () => import('@/components/demo-video-modal').then(mod => ({ default: mod.DemoVideoModal })),
  {
    loading: () => null,
    ssr: false,
  }
);

// PERFORMANCE: Memoized components to prevent unnecessary re-renders
const MemoizedFeatureCard = memo(({ icon, title, description, bullets, delay = '0s' }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets?: string[];
  delay?: string;
}) => (
  <div 
    className="flex flex-col space-y-6 text-left p-6 bg-card/20 backdrop-blur-glass border border-white/10 rounded-xl hover:bg-card/30 transition-all duration-300 group hover:scale-105 hover:shadow-glow-primary/20 animate-slide-up"
    style={{ animationDelay: delay }}
  >
    <div className="flex items-start space-x-4">
      <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-card/50 to-card/80 text-primary group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
    
    {bullets && bullets.length > 0 && (
      <ul className="space-y-2 pl-4">
        {bullets.slice(0, 4).map((bullet, index) => (
          <li key={index} className="flex items-start space-x-2 text-sm">
            <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{bullet}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
));

MemoizedFeatureCard.displayName = 'MemoizedFeatureCard';

const MemoizedTechSpec = memo(({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) => (
  <div className="p-4 bg-card/20 backdrop-blur-glass border border-white/10 rounded-lg">
    <div className="font-semibold text-primary">{icon} {title}</div>
    <div className="text-sm text-muted-foreground">{description}</div>
  </div>
));

MemoizedTechSpec.displayName = 'MemoizedTechSpec';

// PERFORMANCE: Memoized TrustLogoStrip component
const TrustLogoStrip = memo(() => (
  <div className="flex flex-col items-center space-y-3 pt-6">
    <p className="text-sm text-muted-foreground">Trusted by 50+ growing businesses</p>
    <div className="flex items-center justify-center space-x-6 opacity-60">
      <div className="flex items-center space-x-1 text-xs text-muted-foreground font-medium">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>TechFlow Digital</span>
      </div>
      <div className="w-px h-4 bg-white/20"></div>
      <div className="flex items-center space-x-1 text-xs text-muted-foreground font-medium">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>CryptoConsult Pro</span>
      </div>
      <div className="w-px h-4 bg-white/20"></div>
      <div className="flex items-center space-x-1 text-xs text-muted-foreground font-medium">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>GrowthHack Labs</span>
      </div>
    </div>
  </div>
));

TrustLogoStrip.displayName = 'TrustLogoStrip';

export default function Home() {
  const [isDemoVideoOpen, setIsDemoVideoOpen] = useState(false);
  const [shouldLoadBackground, setShouldLoadBackground] = useState(false);
  const [showScarcityBanner, setShowScarcityBanner] = useState(false);

  // PERFORMANCE: Initialize analytics on mount
  useEffect(() => {
    const analytics = initializeAnalytics();
    trackConversion('landing_page_view', {
      source: window.location.search,
      referrer: document.referrer
    });

    // PERSUASION: Show scarcity banner after 15 seconds of engagement
    const scarcityTimer = setTimeout(() => {
      if (window.pageYOffset > 200) { // Only if user has scrolled
        setShowScarcityBanner(true);
      }
    }, 15000);

    return () => {
      analytics?.cleanup();
      clearTimeout(scarcityTimer);
    };
  }, []);

  // PERFORMANCE: Memoized event handlers to prevent re-renders
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
      duration: Date.now() - (window as any).demoStartTime 
    });
  }, []);

  // PERFORMANCE: Load InteractiveBackground only when appropriate
  useEffect(() => {
    const shouldLoad = () => {
      // Check if user prefers reduced motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return false;
      
      // Check viewport size (≥768px)
      const isLargeViewport = window.innerWidth >= 768;
      if (!isLargeViewport) return false;
      
      return true;
    };

    // Use requestIdleCallback for non-critical loading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        if (shouldLoad()) {
          setShouldLoadBackground(true);
        }
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        if (shouldLoad()) {
          setShouldLoadBackground(true);
        }
      }, 100);
    }
  }, []);

  const BackgroundComponent = shouldLoadBackground ? OptimizedInteractiveBackground : 'div';

  return (
    <div className="flex min-h-screen flex-col">
      {/* ACCESSIBILITY: Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/20 backdrop-blur-glass border-b border-white/10" role="banner">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <Logo width={140} height={48} />
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Login
            </Link>
            <Button variant="neon" asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </nav>
        </div>
      </header>
      
      <main id="main-content" className="flex-1" role="main">
        <Suspense fallback={<div className="min-h-screen bg-gradient-dark" />}>
          <BackgroundComponent 
            variant="hero" 
            className="min-h-screen flex items-center justify-center bg-gradient-dark bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,155,240,0.1),rgba(255,255,255,0))] bg-[radial-gradient(ellipse_60%_80%_at_20%_40%,rgba(139,92,246,0.1),transparent)]"
            {...(shouldLoadBackground ? {} : { style: { background: 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--card))' } })}
          >
            <section className="w-full py-20 pt-32" aria-label="Hero section">
              <div className="container px-6">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  {/* Left Content */}
                  <div className="space-y-8 animate-fade-in">
                    <div className="inline-flex items-center px-4 py-2 bg-card/20 backdrop-blur-glass border border-white/10 rounded-full">
                      <span className="text-sm text-muted-foreground">🚀 Join 2,847+ Founders Using AI</span>
                    </div>
                    
                    <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                      <span className="bg-gradient-primary bg-clip-text text-transparent leading-[1.2] py-[6px]">
                        Never Miss Another Call.
                      </span>
                    </h1>
                    
                    <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                      AI receptionist that captures leads 24/7, qualifies prospects instantly, and syncs with your CRM—so you never lose revenue to missed calls again.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      <div className="flex items-center gap-1 text-sm bg-primary/20 backdrop-blur-glass border border-primary/30 rounded-full px-3 py-1">
                        <Zap className="w-4 h-4 text-primary" />
                        <span>24/7 Lead Capture</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm bg-accent/20 backdrop-blur-glass border border-accent/30 rounded-full px-3 py-1">
                        <TrendingUp className="w-4 h-4 text-accent" />
                        <span>10X ROI Guarantee</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm bg-secondary/20 backdrop-blur-glass border border-secondary/30 rounded-full px-3 py-1">
                        <Shield className="w-4 h-4 text-secondary" />
                        <span>API-First Integration</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button variant="neon" size="xl" className="group focus-visible-ring" asChild>
                        <Link 
                          href="/signup" 
                          aria-label="Start your 14-day free trial"
                          onClick={() => trackCTA('start_trial', 'hero_section', { position: 'primary' })}
                        >
                          Start Free Trial
                          <ArrowRight className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="xl" 
                        className="group border-white/20 hover:bg-white/10 focus-visible-ring"
                        onClick={openDemoVideo}
                        aria-label="Watch product demo video, 2 minutes long"
                      >
                        <Play className="mr-2" aria-hidden="true" />
                        Watch Demo
                        <span className="text-xs ml-2 opacity-75" aria-hidden="true">2 min</span>
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      No credit card • Setup in 5 min • Cancel anytime
                    </div>

                    <TrustLogoStrip />

                    <div className="flex items-center space-x-8 pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">340%</div>
                        <div className="text-sm text-muted-foreground">Avg ROI</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-accent">24/7</div>
                        <div className="text-sm text-muted-foreground">Available</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-secondary">99.9%</div>
                        <div className="text-sm text-muted-foreground">Uptime</div>
                      </div>
                    </div>
                  </div>

                  {/* Right Content - Dashboard Preview with OPTIMIZED IMAGE */}
                  <div className="relative animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <div className="relative aspect-video w-full max-w-[500px] overflow-hidden rounded-xl border border-white/10 bg-card/20 backdrop-blur-glass shadow-glass">
                      <Image
                        src="/Spoqen-full.png"
                        alt="Spoqen AI Receptionist Dashboard"
                        fill
                        className="object-contain p-8"
                        priority
                        sizes="(max-width: 768px) 100vw, 500px"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </BackgroundComponent>
        </Suspense>

        {/* PERFORMANCE: Lazy load below-the-fold sections */}
        <Suspense fallback={<div className="h-32 bg-card/20 animate-pulse" />}>
          <TrustIndicators />
        </Suspense>

        <Suspense fallback={<div className="h-96 bg-card/20 animate-pulse" />}>
          <DynamicTestimonialsSection />
        </Suspense>

        <Suspense fallback={<div className="h-96 bg-card/20 animate-pulse" />}>
          <InteractiveDemo />
        </Suspense>

        {/* Micro-testimonial after Interactive Demo */}
        <div className="py-8">
          <div className="container px-6">
            <div className="max-w-2xl mx-auto">
              <MicroTestimonial index={2} />
            </div>
          </div>
        </div>

        <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-background to-card/30" />}>
          <InteractiveBackground variant="features" className="py-20 bg-gradient-to-b from-background to-card/30">
            <section className="w-full">
              <div className="container px-6">
                {/* Problem Banner */}
                <div className="mb-16 animate-fade-in">
                  <ProblemBanner />
                </div>

                <div className="text-center mb-16 animate-fade-in">
                  <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                    Stop Losing Revenue to
                    <span className="bg-gradient-primary bg-clip-text text-transparent"> Missed Opportunities</span>
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    Spoqen captures every call, qualifies every prospect, and converts every opportunity—
                    so you never lose another deal to poor timing or availability.
                  </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
                  <MemoizedFeatureCard
                    icon={<Target className="w-7 h-7" />}
                    title="Know Why They Called—Before Calling Back"
                    description="Stop playing phone tag. Get instant call summaries with intent, budget, timeline, and next steps."
                    bullets={[
                      "Lead qualification in real-time during the call",
                      "Complete conversation summary sent instantly",
                      "Priority scoring so you call hot leads first",
                      "Integration with your existing CRM workflow"
                    ]}
                  />
                  <MemoizedFeatureCard
                    icon={<Clock className="w-7 h-7" />}
                    title="Turn Missed Calls Into Closed Deals"
                    description="Never lose a prospect to timing. Our AI handles objections, books appointments, and nurtures leads 24/7."
                    bullets={[
                      "Professional call handling that builds trust",
                      "Appointment booking directly to your calendar",
                      "Follow-up sequences for prospects who aren't ready",
                      "Escalation protocols for high-value opportunities"
                    ]}
                    delay="0.1s"
                  />
                  <MemoizedFeatureCard
                    icon={<Zap className="w-7 h-7" />}
                    title="Get Notified The Moment Opportunities Hit"
                    description="Hot leads don't wait. Get instant notifications with complete context so you can strike while interest is high."
                    bullets={[
                      "Real-time Slack/email alerts for qualified leads",
                      "Lead scoring based on buying signals",
                      "Automatic CRM updates with conversation data",
                      "Custom triggers for your specific business"
                    ]}
                    delay="0.2s"
                  />
                  <MemoizedFeatureCard
                    icon={<TrendingUp className="w-7 h-7" />}
                    title="Scale Revenue Without Scaling Headcount"
                    description="Handle 10X more calls without hiring more staff. Perfect call handling, every time, at any volume."
                    bullets={[
                      "Unlimited concurrent call capacity",
                      "Consistent qualification process for every lead",
                      "No sick days, breaks, or training costs",
                      "Scales instantly during marketing campaigns"
                    ]}
                    delay="0.3s"
                  />
                </div>

                {/* Technical Specs for Tech Founders */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-8">Effortless Business Integration:</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
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
          </InteractiveBackground>
        </Suspense>

        {/* More sections with lazy loading... */}
        <Suspense fallback={<div className="h-96 bg-card/20 animate-pulse" />}>
          <ROICalculator />
        </Suspense>

        <Suspense fallback={<div className="h-96 bg-card/20 animate-pulse" />}>
          <IntegrationsShowcase />
        </Suspense>

        {/* Pricing Section */}
        <InteractiveBackground variant="minimal" className="py-20 bg-gradient-to-b from-card/30 to-background">
          <section className="w-full">
            <div className="container px-6">
              <div className="text-center mb-16">
                <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                  Simple Pricing,
                  <span className="bg-gradient-primary bg-clip-text text-transparent"> Maximum ROI</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Built for founders who understand the value of time. One plan, unlimited possibilities.
                </p>
              </div>

              <div className="flex justify-center">
                <PricingCard />
              </div>
            </div>
          </section>
        </InteractiveBackground>

        {/* Testimonial Strip after Pricing */}
        <TestimonialStrip />

        {/* Final CTA */}
        <section className="w-full py-20 bg-gradient-to-b from-background to-card/30">
          <div className="container px-6">
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Ready to Scale Your Revenue?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join 2,847+ founders who are already using Spoqen to capture every lead and scale without limits.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button variant="neon" size="xl" className="group focus-visible-ring" asChild>
                  <Link 
                    href="/signup"
                    onClick={() => trackCTA('start_trial', 'final_cta', { position: 'primary' })}
                  >
                    Start Free Trial
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="xl" 
                  className="focus-visible-ring"
                  onClick={() => trackCTA('book_demo', 'final_cta', { position: 'secondary' })}
                >
                  Book a Demo Call
                </Button>
              </div>

              <Suspense fallback={<div className="h-16 bg-card/20 animate-pulse rounded-lg" />}>
                <TrustBadges />
              </Suspense>
            </div>
          </div>
        </section>
      </main>

      {/* PERFORMANCE: Demo video modal loaded on demand */}
      <Suspense fallback={null}>
        <DemoVideoModal
          isOpen={isDemoVideoOpen}
          onClose={closeDemoVideo}
          onVideoEvent={handleVideoEvent}
        />
      </Suspense>

      {/* PERSUASION: Scarcity banner */}
      {showScarcityBanner && (
        <ScarcityBanner
          type="social_proof"
          message="🔥 47 people signed up in the last hour"
          ctaText="Join Now"
          ctaLink="/signup"
          autoHide={true}
          duration={30000}
        />
      )}

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