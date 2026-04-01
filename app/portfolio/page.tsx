import { getPortfolioGalleryPhotos } from '@/lib/portfolio';
import PortfolioGalleryClient from './PortfolioGalleryClient';

export default async function PortfolioPage() {
  const photos = await getPortfolioGalleryPhotos();
  return <PortfolioGalleryClient photos={photos} />;
}
