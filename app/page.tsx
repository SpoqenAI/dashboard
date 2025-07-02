import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, PhoneCall, User, Play } from 'lucide-react';
import { PricingCard } from '@/components/pricing-card';
import Logo from '@/components/ui/logo';
import { InteractiveBackground } from '@/components/interactive-background';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/20 backdrop-blur-glass border-b border-white/10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <Logo width={140} height={48} />
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Login
            </Link>
            <Button variant="neon" asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <InteractiveBackground variant="hero" className="min-h-screen flex items-center justify-center bg-gradient-dark">
          <section className="w-full py-20 pt-32">
            <div className="container px-6">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Content */}
                <div className="space-y-8 animate-fade-in">
                  <div className="inline-flex items-center px-4 py-2 bg-card/20 backdrop-blur-glass border border-white/10 rounded-full">
                    <span className="text-sm text-muted-foreground">🚀 AI-Powered Lead Capture</span>
                  </div>
                  
                  <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                    Never Miss a
                    <span className="bg-gradient-primary bg-clip-text text-transparent block leading-[1.2] py-[6px]">
                      Lead Again
                    </span>
                  </h1>
                  
                  <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                    Spoqen is your AI receptionist that answers calls, qualifies leads, 
                    and emails you summaries—so you can focus on closing deals.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="neon" size="xl" className="group" asChild>
                      <Link href="/signup">
                        Get Started
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                    <Button variant="glass" size="xl" className="group">
                      <Play className="mr-2" />
                      See Demo
                    </Button>
                  </div>

                  <div className="flex items-center space-x-8 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">100%</div>
                      <div className="text-sm text-muted-foreground">Call Coverage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">24/7</div>
                      <div className="text-sm text-muted-foreground">Available</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">60s</div>
                      <div className="text-sm text-muted-foreground">Response Time</div>
                    </div>
                  </div>
                </div>

                {/* Right Content - Dashboard Preview */}
                <div className="relative animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <div className="relative aspect-video w-full max-w-[500px] overflow-hidden rounded-xl border border-white/10 bg-card/20 backdrop-blur-glass shadow-glass">
                    <img
                      src="/Spoqen-full.png"
                      alt="Spoqen Logo"
                      className="h-full w-full object-contain p-8"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </InteractiveBackground>
        <InteractiveBackground variant="features" className="py-20 bg-gradient-to-b from-background to-card/30">
          <section className="w-full">
            <div className="container px-6">
              <div className="text-center mb-16 animate-fade-in">
                <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                  How It 
                  <span className="bg-gradient-primary bg-clip-text text-transparent"> Works</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Spoqen seamlessly integrates with your existing workflow to capture and qualify leads when you're unavailable.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="flex flex-col items-center space-y-6 text-center p-6 bg-card/20 backdrop-blur-glass border border-white/10 rounded-xl hover:bg-card/30 transition-all duration-300 group hover:scale-105 hover:shadow-glow-primary/20 animate-slide-up">
                  <div className="inline-flex p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/80 text-primary group-hover:scale-110 transition-transform duration-300">
                    <PhoneCall className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold">1. Call Answering</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    When you're unavailable, Spoqen answers calls with your personalized greeting.
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-6 text-center p-6 bg-card/20 backdrop-blur-glass border border-white/10 rounded-xl hover:bg-card/30 transition-all duration-300 group hover:scale-105 hover:shadow-glow-accent/20 animate-slide-up" style={{animationDelay: '0.1s'}}>
                  <div className="inline-flex p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/80 text-accent group-hover:scale-110 transition-transform duration-300">
                    <User className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold">2. Lead Qualification</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Your AI assistant asks your customized qualification questions to gather important details.
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-6 text-center p-6 bg-card/20 backdrop-blur-glass border border-white/10 rounded-xl hover:bg-card/30 transition-all duration-300 group hover:scale-105 hover:shadow-glow-secondary/20 animate-slide-up" style={{animationDelay: '0.2s'}}>
                  <div className="inline-flex p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/80 text-secondary group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold">3. Instant Summaries</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Within 60 seconds, you receive a detailed email summary with all the lead information.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </InteractiveBackground>
        <InteractiveBackground variant="minimal" className="py-20 bg-gradient-to-b from-card/30 to-background">
          <section className="w-full">
            <div className="container px-6">
              <div className="flex flex-col items-center justify-center space-y-8 text-center">
                <div className="space-y-4">
                  <h2 className="text-4xl lg:text-5xl font-bold">
                    Ready to Never Miss a 
                    <span className="bg-gradient-primary bg-clip-text text-transparent"> Lead?</span>
                  </h2>
                </div>
                <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <PricingCard />
                </div>
              </div>
            </div>
          </section>
        </InteractiveBackground>
      </main>
      <footer className="w-full border-t border-white/10 bg-card/20 backdrop-blur-glass py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 font-semibold">
            <Logo width={100} height={30} />
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Spoqen. All rights reserved.
          </p>
          <nav className="flex gap-6 text-sm">
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}