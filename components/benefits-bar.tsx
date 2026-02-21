import { CheckCircle2, Clock3, MessageSquareText } from 'lucide-react';

export function BenefitsBar() {
  return (
    <div className="benefits-bar container">
      <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-card/40 p-3 backdrop-blur-glass sm:grid-cols-3 sm:gap-3 sm:p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground sm:text-sm">
            Visual node-based architecture, no coding required
          </span>
        </div>
        <div className="flex items-center gap-3">
          <MessageSquareText className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground sm:text-sm">
            Instantly simulate and debug conversation flows
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Clock3 className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground sm:text-sm">
            Deploy structured prompt configs in seconds
          </span>
        </div>
      </div>
    </div>
  );
}

export default BenefitsBar;
