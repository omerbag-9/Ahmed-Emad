import { getPlacesForRender, placesWithSortedPhotos } from '@/lib/data';
import { getPortfolioGalleryPhotos } from '@/lib/portfolio';
import PortfolioGalleryClient from './PortfolioGalleryClient';

export default async function PortfolioPage() {
  const [photos, places] = await Promise.all([getPortfolioGalleryPhotos(), getPlacesForRender()]);
  const first = placesWithSortedPhotos(places)[0];
  return (
    <PortfolioGalleryClient
      photos={photos}
      nextProject={
        first
          ? {
              slug: first.slug,
              name: first.name,
              location: first.location,
              cover: first.photos[0]?.src || first.coverImage || '',
              label: 'Start with a project',
            }
          : undefined
      }
    />
  );
}
