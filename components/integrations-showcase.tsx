import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Webhook,
  Database,
  MessageSquare,
  Zap,
  BarChart3,
  ArrowRight,
  Link,
} from 'lucide-react';

interface IntegrationCategory {
  title: string;
  description: string;
  icon: React.ElementType;
  integrations: string[];
  color: string;
}

const integrationCategories: IntegrationCategory[] = [
  {
    title: 'CRM & Sales',
    description: 'Keep every lead and conversation organized effortlessly',
    icon: Database,
    integrations: ['HubSpot', 'Salesforce', 'Pipedrive', 'Airtable'],
    color: 'text-primary',
  },
  {
    title: 'Communication',
    description: 'Get updates where your team already collaborates',
    icon: MessageSquare,
    integrations: ['Slack', 'Discord', 'Teams', 'Telegram'],
    color: 'text-accent',
  },
  {
    title: 'Automation',
    description: 'Create smart workflows without writing code',
    icon: Zap,
    integrations: ['Zapier', 'Make', 'n8n', 'Custom Webhooks'],
    color: 'text-secondary',
  },
];

function IntegrationCard({ category }: { category: IntegrationCategory }) {
  return (
    <Card className="hover:shadow-glow-primary/20 group border border-white/10 bg-card/10 transition-all duration-300 hover:scale-105 hover:bg-card/20">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center space-x-3">
          <div
            className={`rounded-lg bg-gradient-to-r from-card/50 to-card/80 p-2 ${category.color}`}
          >
            <category.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{category.title}</h3>
            <p className="text-sm text-muted-foreground">
              {category.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {category.integrations.map((integration, index) => (
            <Badge
              key={index}
              variant="outline"
              className="border-white/20 bg-background/50 text-xs"
            >
              {integration}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function IntegrationsShowcase() {
  return (
    <section className="w-full py-20">
      <div className="container px-6">
        <div className="mb-16 animate-fade-in text-center">
          <h2 className="mb-6 text-4xl font-bold lg:text-5xl">
            Works With Your
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              {' '}
              Favorite Tools
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
            Plug-and-play connections let Spoqen fit right into the tools you
            already use. No coding required. Sync contacts, get instant alerts,
            and automate follow-ups in minutes.
          </p>
        </div>

        <div className="mx-auto mb-12 grid max-w-5xl gap-8 md:grid-cols-3">
          {integrationCategories.map((category, index) => (
            <div
              key={index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <IntegrationCard category={category} />
            </div>
          ))}
        </div>

        {/* API Documentation CTA */}
        <Card className="mx-auto max-w-4xl border border-primary/20 bg-card/10">
          <CardContent className="p-8">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Zap className="h-6 w-6" />
                  <h3 className="text-2xl font-bold">
                    Built for Growing Businesses
                  </h3>
                </div>
                <p className="leading-relaxed text-muted-foreground">
                  Enterprise-grade security, 99.9% uptime, and white-glove
                  support, so you can focus on delighting customers, not
                  managing phone lines.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="border-primary/30 bg-primary/20 text-primary"
                  >
                    <Zap className="mr-1 h-3 w-3" />
                    24/7 Reliability
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="border-accent/30 bg-accent/20 text-accent"
                  >
                    <BarChart3 className="mr-1 h-3 w-3" />
                    Actionable Analytics
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="border-secondary/30 bg-secondary/20 text-secondary"
                  >
                    <Link className="mr-1 h-3 w-3" />
                    White-Glove Support
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-white/20 bg-background/50 p-4">
                  <code className="text-sm text-muted-foreground">
                    <div className="text-primary">CALL SUMMARY</div>
                    <div>Caller: Jane Doe</div>
                    <div>Interest: Pricing Inquiry</div>
                    <div>Next Step: Send Proposal</div>
                    <br />
                    <div className="text-accent">Lead Score: 87</div>
                  </code>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button variant="default" className="group">
                    Book a Live Demo
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Button variant="outline">Start Free Trial</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
