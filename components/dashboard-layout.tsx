'use client';

import type { ReactNode } from 'react';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardHeader } from '@/components/dashboard-header';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col bg-gradient-to-br from-background via-purple-950/10 to-blue-950/10">
        <DashboardHeader />
        {children}
      </div>
    </div>
  );
}
