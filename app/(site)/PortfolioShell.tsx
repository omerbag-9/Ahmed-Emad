import { getPlacesForRender, placesWithSortedPhotos } from '@/lib/data';
import { getPortfolioGalleryPhotos } from '@/lib/portfolio';
import PortfolioLayoutClient, { type SidebarPlace } from './PortfolioLayoutClient';

export default async function PortfolioShell({ children }: { children: React.ReactNode }) {
  const [rawPlaces, portfolio] = await Promise.all([getPlacesForRender(), getPortfolioGalleryPhotos()]);
  const places = placesWithSortedPhotos(rawPlaces);

  const sidebarPlaces: SidebarPlace[] = places.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    location: p.location,
    photoCount: p.photos.length,
    cover: p.photos[0]?.src || p.coverImage || '',
  }));

  return (
    <PortfolioLayoutClient places={sidebarPlaces} portfolioCount={portfolio.length}>
      {children}
    </PortfolioLayoutClient>
  );
}
