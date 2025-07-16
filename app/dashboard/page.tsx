export const metadata = {
  title: 'Dashboard | Spoqen',
};

import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to Recent Calls as the new default dashboard view
  redirect('/recent-calls');
}
