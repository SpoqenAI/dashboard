'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid a hydration mismatch between SSR and CSR
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render nothing (or a skeleton) until we know the real theme
    return null;
  }

  const isDark = resolvedTheme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? 'Light mode' : 'Dark mode';

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-muted-foreground"
      onClick={() => setTheme(nextTheme)}
    >
      <Icon className="h-[1.2rem] w-[1.2rem]" />
      <span className="ml-2 text-sm">{label}</span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
