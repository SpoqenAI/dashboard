'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/ui/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navLinks = [
  { name: 'Home', href: '/#top' },
  { name: 'Features', href: '/#features' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Contact', href: '/contact' },
];

export function LandingHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-white/10 bg-card/20 backdrop-blur-glass">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center transition-transform duration-300 hover:scale-105"
        >
          <Logo width={178} height={50} />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map(link => {
            const active =
              link.href === '/#top'
                ? pathname === '/'
                : pathname === link.href || pathname === link.href.replace('/#', '/');

            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  'group relative pb-2 text-sm font-medium transition-colors hover:text-primary',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {link.name}
                <span
                  className={cn(
                    'pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-green-500 transition-opacity duration-300',
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                  )}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/contact">Talk to Sales</Link>
          </Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] sm:w-[360px]"
              aria-label="Navigation menu"
            >
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col space-y-4">
                {navLinks.map(link => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.name}
                  </Link>
                ))}
                <Button
                  asChild
                  className="mt-6"
                  onClick={() => setMobileOpen(false)}
                >
                  <Link href="/contact">Talk to Sales</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
