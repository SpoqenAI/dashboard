import { Badge } from '@/components/ui/badge';
import { Shield, Star, Users, Lock } from 'lucide-react';

export function TrustIndicators() {
  return (
    <div className="w-full border-y border-white/10 bg-card/10 py-4 backdrop-blur-glass">
      <div className="container px-6">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium">🔥 2,847+ founders using Spoqen</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4 text-accent" />
            <span className="font-medium">🔒 SOC 2 Certified</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="h-4 w-4 text-secondary" />
            <span className="font-medium">⭐ 4.8/5 on G2</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-4 w-4 text-primary" />
            <span className="font-medium">GDPR Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrustBadges() {
  const badges = [
    { label: 'SOC 2 Type II', icon: Shield, color: 'text-primary' },
    { label: 'GDPR', icon: Lock, color: 'text-accent' },
    { label: 'ISO 27001', icon: Shield, color: 'text-secondary' },
  ];

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
      <span className="text-sm font-medium text-muted-foreground">
        Trusted & Secure:
      </span>
      {badges.map((badge, index) => (
        <Badge
          key={index}
          variant="outline"
          className="border-white/20 bg-card/20 backdrop-blur-glass transition-all hover:bg-card/30"
        >
          <badge.icon className={`mr-1 h-3 w-3 ${badge.color}`} />
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}

export function UrgencyBanner() {
  return (
    <div className="w-full border border-primary/30 bg-gradient-to-r from-primary/20 to-accent/20 py-3">
      <div className="container px-6">
        <div className="text-center">
          <span className="text-sm font-medium text-foreground">
            🚀 Early Access: Join 500+ alpha users •
            <span className="ml-2 text-primary">Limited spots remaining</span>
          </span>
        </div>
      </div>
    </div>
  );
}
