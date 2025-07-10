'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import Logo from '@/components/ui/logo';
import { useAuth } from '@/hooks/use-auth';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LayoutDashboard,
  Settings,
  BarChart3,
  CreditCard,
  HelpCircle,
  Menu,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    requiresAuth: true,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
    requiresAuth: true,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    requiresAuth: true,
  },
  {
    name: 'Billing',
    href: '/billing',
    icon: CreditCard,
    requiresAuth: true,
  },
];

export function GlobalHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't show navigation on onboarding pages
  const isOnboarding = pathname?.startsWith('/onboarding');
  const isLandingPage = pathname === '/';
  const isAuthPage =
    pathname?.includes('/login') ||
    pathname?.includes('/signup') ||
    pathname?.includes('/forgot-password') ||
    pathname?.includes('/reset-password');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-card/20 backdrop-blur-glass">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center transition-transform duration-300 hover:scale-105"
          >
            <Logo width={140} height={48} />
          </Link>
        </div>

        {/* Navigation - only show if user is authenticated and not on onboarding */}
        {user && !isOnboarding && !loading && (
          <nav className="hidden items-center space-x-6 md:flex">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Mobile menu button for authenticated users */}
        {user && !isOnboarding && !loading && (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-4">
                {navigationItems.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center space-x-3 rounded-md p-2 text-lg font-medium transition-colors hover:text-primary',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                <div className="border-t pt-4">
                  <Link
                    href="/contact"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-3 rounded-md p-2 text-lg font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    <HelpCircle className="h-5 w-5" />
                    <span>Help & Support</span>
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Theme toggle - always visible */}
          <ThemeToggle />

          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <>
              {/* Help/Support link for authenticated users */}
              <Link
                href="/contact"
                className="hidden items-center space-x-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:flex"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Help</span>
              </Link>
              <UserNav />
            </>
          ) : (
            /* Show login/signup for non-authenticated users */
            !isAuthPage && (
              <nav className="flex items-center gap-4">
                {isLandingPage && (
                  <>
                    <Link
                      href="#features"
                      className="text-sm font-medium transition-colors hover:text-primary"
                    >
                      Features
                    </Link>
                    <Link
                      href="#pricing"
                      className="text-sm font-medium transition-colors hover:text-primary"
                    >
                      Pricing
                    </Link>
                  </>
                )}
                <Link
                  href="/login"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Login
                </Link>
                <Button asChild size="sm">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </nav>
            )
          )}
        </div>
      </div>
    </header>
  );
}
