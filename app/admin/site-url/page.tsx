import { UpdateSiteUrlHelper } from '@/components/update-site-url-helper';
import { DashboardLayout } from '@/components/dashboard-layout';
import { DashboardShell } from '@/components/dashboard-shell';

export default function SiteUrlPage() {
  return (
    <DashboardLayout>
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Site URL Configuration
          </h2>
        </div>
        <div className="mt-6">
          <UpdateSiteUrlHelper />
        </div>
      </DashboardShell>
    </DashboardLayout>
  );
}
