import { checkAdminAuth } from '@/lib/check-auth';
import styles from '../admin.module.css';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await checkAdminAuth();

  return <>{children}</>;
}
