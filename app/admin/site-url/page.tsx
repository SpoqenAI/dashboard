import { UpdateSiteUrlHelper } from "@/components/update-site-url-helper"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"

export default function SiteUrlPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Site URL Configuration</h2>
        </div>
        <div className="mt-6">
          <UpdateSiteUrlHelper />
        </div>
      </DashboardShell>
    </div>
  )
}
