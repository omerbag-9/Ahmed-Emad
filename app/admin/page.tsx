import { checkAdminAuth } from '@/lib/check-auth';
import AdminDashboard from './dashboard';

export default async function AdminPage() {
  await checkAdminAuth();
  return <AdminDashboard />;
}
