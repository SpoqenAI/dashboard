import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, Headphones, BarChart3, Sparkles } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge variant="secondary" className="mx-auto w-fit">
            Custom & Enterprise Only
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
            Pricing tailored to your business
          </h1>
          <p className="text-lg text-muted-foreground">
            We craft bespoke plans based on your call volume, compliance needs,
            and integrations. Tell us what you need, and we’ll design the right
            package.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/contact">Talk to sales</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/faq">View common questions</Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Tailored onboarding
              </CardTitle>
              <CardDescription>
                Dedicated launch support to map your call flows and automations.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• White-glove setup</li>
                <li>• Playbook design and testing</li>
                <li>• Data and CRM wiring</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Enterprise guardrails
              </CardTitle>
              <CardDescription>
                Compliance, security, and quality controls for regulated teams.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• SOC 2–ready controls</li>
                <li>• Region-aware routing</li>
                <li>• Audit trails & retention options</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" />
                Premium support
              </CardTitle>
              <CardDescription>
                Direct access to product experts for fast resolution.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• Named support manager</li>
                <li>• SLA-backed response times</li>
                <li>• Quarterly reviews & optimization</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Built for your call mix
              </CardTitle>
              <CardDescription>
                Pricing aligns with your inbound/outbound mix, seasonality, and
                languages.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• Flexible call bundles</li>
                <li>• Usage-based or committed options</li>
                <li>• Volume tiers as you scale</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Outcome-first approach
              </CardTitle>
              <CardDescription>
                We focus on answered calls, booked meetings, and lead quality—
                not vanity minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• Conversion-focused scripts</li>
                <li>• A/B testing and tuning</li>
                <li>• Shared dashboards and alerts</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-20 rounded-2xl border bg-muted/30 p-8 text-center sm:p-12">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Let&apos;s design the right plan together
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tell us about your call volume, teams, and regions. We’ll respond
            with a tailored proposal and onboarding plan.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/contact">Talk to sales</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="mailto:hello@spoqen.com">Email us</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
