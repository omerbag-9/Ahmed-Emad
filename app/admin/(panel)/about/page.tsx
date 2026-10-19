import { checkAdminAuth } from '@/lib/check-auth';
import { getAboutContent } from '@/lib/about';
import AboutEditor from './about-editor';

export default async function AdminAboutPage() {
  /* Layout and page render in parallel: guard here too so no data is fetched without a session */
  await checkAdminAuth();
  return <AboutEditor initial={await getAboutContent()} />;
}
