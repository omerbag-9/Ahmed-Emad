import { getPlacesForRender, placesWithSortedPhotos } from '@/lib/data';
import HomeHero, { type HomeSlide } from './HomeHero';

/* The slides come from the projects, which change from the admin */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const places = placesWithSortedPhotos(await getPlacesForRender());
  /* One wide photograph per project (falls back to its first photo) */
  const slides: HomeSlide[] = places.flatMap((p) => {
    const photo = p.photos.find((ph) => ph.width > ph.height) ?? p.photos[0];
    return photo
      ? [{ slug: p.slug, name: p.name, location: p.location, src: photo.src, width: photo.width, height: photo.height }]
      : [];
  });

  return <HomeHero slides={slides} />;
}
