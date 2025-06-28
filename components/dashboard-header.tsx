import Link from 'next/link';
import { UserNav } from '@/components/user-nav';
import Logo from '@/components/ui/logo';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/dashboard">
            <Logo width={140} height={48} />
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          <UserNav />
        </nav>
      </div>
    </header>
  );
}
