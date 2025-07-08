import type React from 'react';
import { InteractiveBackground } from '@/components/interactive-background';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <InteractiveBackground variant="dashboard" className="flex-1">
      <div className="space-y-4 p-8 pt-6">{children}</div>
    </InteractiveBackground>
  );
}
