import Link from 'next/link';
import { UserNav } from '@/components/user-nav';
import Logo from '@/components/ui/logo';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-10 w-full border-b border-white/10 bg-card/20 backdrop-blur-glass">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link
            href="/"
            className="transition-transform duration-300 hover:scale-105"
          >
            <Logo width={178} height={50} />
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          <UserNav />
        </nav>
      </div>
    </header>
  );
}
