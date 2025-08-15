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
  Phone,
  BarChart3,
  Settings,
  Cog,
  HelpCircle,
  BookOpen,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navigationItems = [
  {
    name: 'Recent Calls',
    href: '/recent-calls',
    icon: Phone,
    requiresAuth: true,
  },
  {
    name: 'Call Analytics',
    href: '/call-analytics',
    icon: BarChart3,
    requiresAuth: true,
  },
  {
    name: 'AI Configuration',
    href: '/ai-configuration',
    icon: Cog,
    requiresAuth: true,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    requiresAuth: true,
  },
];

export function GlobalHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't show navigation on onboarding pages
  const isOnboarding =
    pathname?.startsWith('/onboarding') || pathname?.startsWith('/welcome');
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
            <Logo width={178} height={50} />
          </Link>
        </div>

        {/* Centered navigation for public (logged-out) pages (desktop only) */}
        {!user && !loading && !isAuthPage && (
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 lg:flex">
            <Link
              href="/#top"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Home
            </Link>
            <Link
              href="/#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Pricing
            </Link>
          </nav>
        )}

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
                <div className="space-y-2 border-t pt-4">
                  <Link
                    href="/faq"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-3 rounded-md p-2 text-lg font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    <BookOpen className="h-5 w-5" />
                    <span>FAQ</span>
                  </Link>
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

        {/* Mobile menu button for non-authenticated users */}
        {!user && !loading && !isAuthPage && (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-4">
                <Link
                  href="/#top"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center rounded-md p-2 text-lg font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  Home
                </Link>
                <Link
                  href="/#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center rounded-md p-2 text-lg font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  Features
                </Link>
                <Link
                  href="/#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center rounded-md p-2 text-lg font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  Pricing
                </Link>
                <div className="space-y-2 border-t pt-4">
                  <Link
                    href="/faq"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-3 rounded-md p-2 text-lg font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    <BookOpen className="h-5 w-5" />
                    <span>FAQ</span>
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-3 rounded-md p-2 text-lg font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    <HelpCircle className="h-5 w-5" />
                    <span>Help & Support</span>
                  </Link>
                </div>
                <div className="mt-4 flex flex-col space-y-2">
                  <Button asChild variant="outline">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* FAQ & Help links - always visible to all users */}
          <Link
            href="/faq"
            className="hidden items-center space-x-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary lg:flex"
          >
            <BookOpen className="h-4 w-4" />
            <span>FAQ</span>
          </Link>
          <Link
            href="/contact"
            className="hidden items-center space-x-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary lg:flex"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help</span>
          </Link>

          {/* Theme toggle - always visible */}
          <ThemeToggle />

          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <>
              <UserNav />
            </>
          ) : (
            /* Show login/signup for non-authenticated users */
            !isAuthPage && (
              <nav className="flex items-center gap-4">
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
