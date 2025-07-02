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
  Link
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
    title: "CRM & Sales",
    description: "Keep every lead and conversation organized effortlessly",
    icon: Database,
    integrations: ["HubSpot", "Salesforce", "Pipedrive", "Airtable"],
    color: "text-primary"
  },
  {
    title: "Communication",
    description: "Get updates where your team already collaborates",
    icon: MessageSquare,
    integrations: ["Slack", "Discord", "Teams", "Telegram"],
    color: "text-accent"
  },
  {
    title: "Automation",
    description: "Create smart workflows without writing code",
    icon: Zap,
    integrations: ["Zapier", "Make", "n8n", "Custom Webhooks"],
    color: "text-secondary"
  }
];

function IntegrationCard({ category }: { category: IntegrationCategory }) {
  return (
    <Card className="bg-card/20 backdrop-blur-glass border border-white/10 hover:bg-card/30 transition-all duration-300 group hover:scale-105 hover:shadow-glow-primary/20">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-gradient-to-r from-card/50 to-card/80 ${category.color}`}>
            <category.icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{category.title}</h3>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {category.integrations.map((integration, index) => (
            <Badge 
              key={index}
              variant="outline" 
              className="bg-background/50 border-white/20 text-xs"
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
    <section className="w-full py-20 bg-gradient-to-b from-card/30 to-background">
      <div className="container px-6">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Works With Your
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Favorite Tools</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Plug-and-play connections let Spoqen fit right into the tools you already use—no coding required. 
            Sync contacts, get instant alerts, and automate follow-ups in minutes.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
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
        <Card className="bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-glass border border-primary/30 max-w-4xl mx-auto">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Zap className="w-6 h-6" />
                  <h3 className="text-2xl font-bold">Built for Growing Businesses</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Enterprise-grade security, 99.9% uptime, and white-glove support—so you can focus on delighting customers, not managing phone lines.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                    <Zap className="w-3 h-3 mr-1" />
                    24/7 Reliability
                  </Badge>
                  <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Actionable Analytics
                  </Badge>
                  <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30">
                    <Link className="w-3 h-3 mr-1" />
                    White-Glove Support
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-background/50 border border-white/20 rounded-lg p-4">
                  <code className="text-sm text-muted-foreground">
                    <div className="text-primary">CALL SUMMARY</div>
                    <div>Caller: Jane Doe</div>
                    <div>Interest: Pricing Inquiry</div>
                    <div>Next Step: Send Proposal</div>
                    <br />
                    <div className="text-accent">Lead Score: 87</div>
                  </code>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="default" className="group">
                    Book a Live Demo
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button variant="outline">
                    Start Free Trial
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
} 