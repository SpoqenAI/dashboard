import { Badge } from '@/components/ui/badge';
import { Shield, Star, Users, Lock } from 'lucide-react';

export function TrustIndicators() {
  return (
    <div className="w-full py-4 bg-card/10 backdrop-blur-glass border-y border-white/10">
      <div className="container px-6">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium">🔥 2,847+ founders using Spoqen</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-4 h-4 text-accent" />
            <span className="font-medium">🔒 SOC 2 Certified</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="w-4 h-4 text-secondary" />
            <span className="font-medium">⭐ 4.8/5 on G2</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="w-4 h-4 text-primary" />
            <span className="font-medium">GDPR Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrustBadges() {
  const badges = [
    { label: "SOC 2 Type II", icon: Shield, color: "text-primary" },
    { label: "GDPR", icon: Lock, color: "text-accent" },
    { label: "ISO 27001", icon: Shield, color: "text-secondary" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
      <span className="text-sm text-muted-foreground font-medium">Trusted & Secure:</span>
      {badges.map((badge, index) => (
        <Badge 
          key={index}
          variant="outline" 
          className="bg-card/20 backdrop-blur-glass border-white/20 hover:bg-card/30 transition-all"
        >
          <badge.icon className={`w-3 h-3 mr-1 ${badge.color}`} />
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}

export function UrgencyBanner() {
  return (
    <div className="w-full py-3 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
      <div className="container px-6">
        <div className="text-center">
          <span className="text-sm font-medium text-foreground">
            🚀 Early Access: Join 500+ alpha users  •  
            <span className="text-primary ml-2">Limited spots remaining</span>
          </span>
        </div>
      </div>
    </div>
  );
} 