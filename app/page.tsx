import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, PhoneCall, User } from 'lucide-react';
import { PricingCard } from '@/components/pricing-card';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <PhoneCall className="h-5 w-5 text-primary" />
            <span>Spoqen</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium">
              Login
            </Link>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full bg-gradient-to-b from-white to-gray-50 py-12 dark:from-gray-950 dark:to-gray-900 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Never Miss a Lead Again
                  </h1>
                  <p className="max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl">
                    Spoqen is your AI receptionist that answers calls, qualifies
                    leads, and emails you summaries—so you can focus on closing
                    deals.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/signup">
                      Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/demo">See Demo</Link>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative aspect-video w-full max-w-[500px] overflow-hidden rounded-xl border bg-background shadow-xl">
                  <img
                    src="/placeholder.svg?height=500&width=800&query=real estate agent on phone with modern dashboard interface"
                    alt="Spoqen AI Receptionist Dashboard Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  How It Works
                </h2>
                <p className="max-w-[900px] text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Spoqen seamlessly integrates with your existing workflow to
                  capture and qualify leads when you're unavailable.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <PhoneCall className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">1. Call Answering</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  When you're unavailable, Spoqen answers calls with your
                  personalized greeting.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">2. Lead Qualification</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Your AI assistant asks your customized qualification questions
                  to gather important details.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">3. Instant Summaries</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Within 60 seconds, you receive a detailed email summary with
                  all the lead information.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full bg-gray-50 py-12 dark:bg-gray-900 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to Never Miss a Lead?
                </h2>
              </div>
              <PricingCard />
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 font-semibold">
            <PhoneCall className="h-5 w-5 text-primary" />
            <span>Spoqen</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2025 Spoqen. All rights reserved.
          </p>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/terms"
              className="text-gray-500 hover:underline dark:text-gray-400"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-gray-500 hover:underline dark:text-gray-400"
            >
              Privacy
            </Link>
            <Link
              href="/contact"
              className="text-gray-500 hover:underline dark:text-gray-400"
            >
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
