'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Receipt, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Logo from '@/components/ui/logo';

function isActive(path: string, pathname: string) {
  return pathname === path;
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const itemClass = (path: string) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg ${isActive(path, pathname) ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`;

  return (
    <aside className="bg-sidebar text-sidebar-foreground w-64 p-6 space-y-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center space-x-2 mb-10">
          <Link href="/">
            <Logo width={120} height={40} />
          </Link>
        </div>
        <nav className="space-y-2">
          <Link href="/dashboard" className={itemClass('/dashboard')}>
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/profile" className={itemClass('/profile')}>
            <Users className="h-5 w-5" />
            <span>Profile</span>
          </Link>
          <Link href="/billing" className={itemClass('/billing')}>
            <Receipt className="h-5 w-5" />
            <span>Billing</span>
          </Link>
        </nav>
      </div>
      <div className="space-y-2">
        <Link href="/settings" className={itemClass('/settings')}>
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>
        <Link href="/contact" className={itemClass('/contact')}>
          <HelpCircle className="h-5 w-5" />
          <span>Help Center</span>
        </Link>
        <button
          onClick={() => signOut()}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
