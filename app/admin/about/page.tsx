import { checkAdminAuth } from '@/lib/check-auth';
import AboutEditor from './about-editor';

export default async function AdminAboutPage() {
  await checkAdminAuth();
  return <AboutEditor />;
}
