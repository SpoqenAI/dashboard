import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import Logo from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Profile', icon: Users },
  { href: '/billing', label: 'Billing', icon: FileText },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="sidebar bg-sidebar-background text-sidebar-foreground flex w-64 flex-col justify-between space-y-6 border-r p-6">
      <div>
        <div className="mb-10 flex items-center space-x-2">
          <Link href="/">
            <Logo width={140} height={48} />
          </Link>
        </div>
        <nav className="space-y-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-item hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center space-x-3 rounded-lg px-4 py-3 ${
                pathname === href
                  ? 'active bg-sidebar-accent text-sidebar-accent-foreground outline-sidebar-ring shadow outline outline-2'
                  : 'text-sidebar-foreground/70'
              }`}
            >
              <Icon className="icon h-5 w-5" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="space-y-2">
        <Link
          href="/help"
          className="sidebar-item text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center space-x-3 rounded-lg px-4 py-3"
        >
          <HelpCircle className="icon h-5 w-5" />
          <span>Help Center</span>
        </Link>
        <Button
          variant="ghost"
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-start rounded-lg px-4 py-3"
          onClick={signOut}
        >
          <LogOut className="icon mr-3 h-5 w-5" /> Logout
        </Button>
      </div>
    </aside>
  );
}
