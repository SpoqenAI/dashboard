import type React from 'react';
import { SimpleBackground } from '@/components/simple-background';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SimpleBackground variant="minimal" className="flex-1">
      <div className="relative z-10 space-y-4 p-4 pt-4 sm:p-8 sm:pt-6">
        {children}
      </div>
    </SimpleBackground>
  );
}
