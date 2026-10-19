import { checkAdminAuth } from '@/lib/check-auth';
import { getAboutContent } from '@/lib/about';
import { getHomeContent } from '@/lib/home';
import { getPlacesForRender, placesWithSortedPhotos } from '@/lib/data';
import { getPortfolioGalleryPhotos } from '@/lib/portfolio';
import AdminDashboard from './dashboard';

export default async function AdminPage() {
  /* Layout and page render in parallel: guard here too so no data is fetched without a session */
  await checkAdminAuth();
  const [places, portfolio, about, home] = await Promise.all([
    getPlacesForRender(),
    getPortfolioGalleryPhotos(),
    getAboutContent(),
    getHomeContent(),
  ]);
  return (
    <AdminDashboard
      projects={placesWithSortedPhotos(places).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        location: p.location?.trim() || '',
        photoCount: p.photos.length,
        cover: p.photos[0]?.thumbnail || p.coverImage || '',
      }))}
      portfolioCount={portfolio.length}
      portfolioThumbs={portfolio.slice(0, 8).map((p) => p.thumbnail || p.src)}
      about={{ lead: about.lead.trim(), image: about.imageSrc.trim() }}
      home={{ lede: home.lede.trim(), chosen: home.slides.length }}
    />
  );
}
