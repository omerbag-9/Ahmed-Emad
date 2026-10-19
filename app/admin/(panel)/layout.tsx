import { checkAdminAuth } from '@/lib/check-auth';
import { getPlacesForRender, placesWithSortedPhotos } from '@/lib/data';
import { getPortfolioGalleryPhotos } from '@/lib/portfolio';
import AdminShell from '../_components/AdminShell';

/* Admin views must always show the latest saved data */
export const dynamic = 'force-dynamic';

/** Every signed-in admin screen: one sidebar with each section and every project. */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await checkAdminAuth();
  const [places, portfolio] = await Promise.all([getPlacesForRender(), getPortfolioGalleryPhotos()]);
  const projects = placesWithSortedPhotos(places).map((p) => ({
    id: p.id,
    name: p.name,
    photoCount: p.photos.length,
    cover: p.photos[0]?.thumbnail || p.photos[0]?.src || p.coverImage || '',
  }));

  return (
    <AdminShell projects={projects} portfolioCount={portfolio.length}>
      {children}
    </AdminShell>
  );
}
