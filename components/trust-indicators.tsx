import { Badge } from '@/components/ui/badge';
import { Shield, Star, Users, Lock } from 'lucide-react';

export function TrustIndicators() {
  return (
    <div className="w-full border-y border-white/10 bg-card/10 py-4 backdrop-blur-glass">
      <div className="container px-6">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium">🚀 Early Access Available</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-4 w-4 text-accent" />
            <span className="font-medium">🔒 Secure & Private</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrustBadges() {
  // Removed fake certifications - will add real ones when obtained
  return null;
}

export function UrgencyBanner() {
  return (
    <div className="w-full border border-primary/30 bg-gradient-to-r from-primary/20 to-accent/20 py-3">
      <div className="container px-6">
        <div className="text-center">
          <span className="text-sm font-medium text-foreground">
            🚀 Early Access Available •
            <span className="ml-2 text-primary">Limited spots remaining</span>
          </span>
        </div>
      </div>
    </div>
  );
}
