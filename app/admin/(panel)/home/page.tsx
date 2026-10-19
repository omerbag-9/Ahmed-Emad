import { checkAdminAuth } from '@/lib/check-auth';
import { getPlacesForRender, placesWithSortedPhotos } from '@/lib/data';
import { getHomeContent, PORTFOLIO_SOURCE } from '@/lib/home';
import { getPortfolioGalleryPhotos } from '@/lib/portfolio';
import HomeEditor, { type PhotoSource } from './home-editor';

export default async function AdminHomePage() {
  /* Layout and page render in parallel: guard here too so no data is fetched without a session */
  await checkAdminAuth();
  const [content, places, portfolio] = await Promise.all([
    getHomeContent(),
    getPlacesForRender(),
    getPortfolioGalleryPhotos(),
  ]);

  const toPhoto = (p: { id: string; src: string; thumbnail: string; width: number; height: number }) => ({
    id: p.id,
    thumb: p.thumbnail || p.src,
    wide: p.width > p.height,
    tall: p.height > p.width,
  });
  const sources: PhotoSource[] = [
    ...placesWithSortedPhotos(places).map((p) => ({ id: p.id, name: p.name, photos: p.photos.map(toPhoto) })),
    { id: PORTFOLIO_SOURCE, name: 'Main portfolio', photos: portfolio.map(toPhoto) },
  ].filter((s) => s.photos.length);

  return <HomeEditor initial={content} sources={sources} />;
}
