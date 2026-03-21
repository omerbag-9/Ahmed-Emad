import { checkAdminAuth } from '@/lib/check-auth';
import PortfolioGalleryAdmin from './portfolio-gallery';

export default async function AdminPortfolioPage() {
  await checkAdminAuth();
  return <PortfolioGalleryAdmin />;
}
