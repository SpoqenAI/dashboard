import type React from 'react';
import { SimpleBackground } from '@/components/simple-background';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SimpleBackground variant="minimal" className="flex-1">
      <div className="space-y-4 p-8 pt-6">{children}</div>
    </SimpleBackground>
  );
}
