import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MotionHover, MotionItem, MotionStagger } from '@/components/motion';
import {
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
    title: 'Voice Providers',
    description: 'Deploy prompts instantly to your preferred telephony provider',
    icon: Database,
    integrations: ['Twilio', 'Vonage', 'Bland AI', 'Vapi'],
    color: 'text-primary',
  },
  {
    title: 'LLM Runtimes',
    description: 'Format prompts directly for the leading AI models',
    icon: MessageSquare,
    integrations: ['OpenAI', 'Anthropic', 'Gemini', 'Local Models'],
    color: 'text-accent',
  },
  {
    title: 'Developer Tools',
    description: 'Integrate into your existing CI/CD pipelines',
    icon: Zap,
    integrations: ['GitHub', 'GitLab', 'Vercel', 'Custom Webhooks'],
    color: 'text-secondary',
  },
];

function IntegrationCard({ category }: { category: IntegrationCategory }) {
  return (
    <MotionHover className="h-full" lift={6} scale={1.03}>
      <Card className="hover:shadow-glow-primary/20 group h-full border border-white/10 bg-card/10 transition-all duration-300 hover:bg-card/20">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center space-x-3">
            <div
              className={`rounded-lg bg-gradient-to-r from-card/50 to-card/80 p-2 ${category.color}`}
            >
              <category.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {category.title}
              </h3>
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
    </MotionHover>
  );
}

export function IntegrationsShowcase() {
  return (
    <section className="w-full py-20">
      <div className="container px-6">
        <MotionStagger inView className="mb-16 text-center">
          <MotionItem>
            <h2 className="mb-6 text-4xl font-bold lg:text-5xl">
              Works With Your
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                {' '}
                Favorite Tools
              </span>
            </h2>
          </MotionItem>
          <MotionItem>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
              Spoqen produces standard JSON, raw text, and API schemas that plug directly into the tools you
              already use to run voice agents.
            </p>
          </MotionItem>
        </MotionStagger>

        <MotionStagger
          inView
          className="mx-auto mb-12 grid max-w-5xl gap-8 md:grid-cols-3"
        >
          {integrationCategories.map((category, index) => (
            <MotionItem key={index}>
              <IntegrationCard category={category} />
            </MotionItem>
          ))}
        </MotionStagger>

        {/* API Documentation CTA */}
        <Card className="mx-auto max-w-4xl border border-primary/20 bg-card/10">
          <CardContent className="p-8">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Zap className="h-6 w-6" />
                  <h3 className="text-2xl font-bold">
                    Built for Developers
                  </h3>
                </div>
                <p className="leading-relaxed text-muted-foreground">
                  Treat prompts like code. Use our robust API to generate, validate, and pull the latest versions of your prompt graphs directly into your backend.
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
                    <div className="text-primary">GET /v1/prompts/latest</div>
                    <div>{'{'}</div>
                    <div>&nbsp;&nbsp;"id": "flow-a1b2",</div>
                    <div>&nbsp;&nbsp;"version": 14,</div>
                    <div>&nbsp;&nbsp;"validation": "passing"</div>
                    <div>{'}'}</div>
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
