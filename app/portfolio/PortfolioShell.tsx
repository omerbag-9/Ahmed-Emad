import { getPlaces, placesWithSortedPhotos } from '@/lib/data';
import PortfolioLayoutClient from './PortfolioLayoutClient';

type Variant = 'gallery' | 'page';

export default async function PortfolioShell({
  children,
  variant = 'gallery',
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  const places = placesWithSortedPhotos(await getPlaces());

  const sidebarPlaces = places.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    location: p.location,
  }));

  return (
    <PortfolioLayoutClient places={sidebarPlaces} variant={variant}>
      {children}
    </PortfolioLayoutClient>
  );
}
