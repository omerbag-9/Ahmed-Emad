import { checkAdminAuth } from '@/lib/check-auth';
import { getPortfolioGalleryPhotos } from '@/lib/portfolio';
import PortfolioGalleryAdmin from './portfolio-gallery';

export default async function AdminPortfolioPage() {
  /* Layout and page render in parallel: guard here too so no data is fetched without a session */
  await checkAdminAuth();
  const photos = await getPortfolioGalleryPhotos();
  return <PortfolioGalleryAdmin initialPhotos={photos.map(({ id, src, thumbnail, alt }) => ({ id, src, thumbnail, alt }))} />;
}
