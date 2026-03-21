import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    redirect('/admin/login');
  }

  // Basic JWT structure validation
  const parts = token.split('.');
  if (parts.length !== 3) {
    redirect('/admin/login');
  }

  return true;
}
