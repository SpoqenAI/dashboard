import Link from "next/link"
import { PhoneCall } from "lucide-react"
import { UserNav } from "@/components/user-nav"

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl">
          <PhoneCall className="h-5 w-5 text-primary" />
          <Link href="/dashboard">Spoqen</Link>
        </div>
        <nav className="flex items-center gap-4">
          <UserNav />
        </nav>
      </div>
    </header>
  )
}
