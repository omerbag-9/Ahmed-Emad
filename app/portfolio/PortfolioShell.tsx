import { getPlaces, getCategories, placesWithSortedPhotos } from '@/lib/data';
import PortfolioLayoutClient from './PortfolioLayoutClient';

type Variant = 'gallery' | 'page';

export default function PortfolioShell({
  children,
  variant = 'gallery',
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  const places = placesWithSortedPhotos(getPlaces());
  const categories = getCategories();

  const sidebarPlaces = places.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    location: p.location,
  }));

  return (
    <PortfolioLayoutClient
      categories={categories}
      places={sidebarPlaces}
      variant={variant}
    >
      {children}
    </PortfolioLayoutClient>
  );
}
