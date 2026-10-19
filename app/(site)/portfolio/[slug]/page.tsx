import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ResponsiveGallery from '@/components/ResponsiveGallery';
import { getPlacesForRender, placesWithSortedPhotos, sortPhotosByOrder } from '@/lib/data';
import portfolioStyles from '../portfolio.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

async function findPlace(slug: string) {
  return (await getPlacesForRender()).find((p) => p.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = await findPlace(slug);
  /* The portfolio layout's string title stops the root template here, so add the suffix (as /about does) */
  if (!place) return { title: 'Project not found | Ahmed Emad Photographs' };
  const where = place.location?.trim();
  return {
    title: `${where ? `${place.name} · ${where}` : place.name} | Ahmed Emad Photographs`,
    description:
      place.brief?.trim() ||
      `Architectural photography of ${place.name}${where ? `, ${where}` : ''} by Ahmed Emad.`,
  };
}

/**
 * Rendered on the server with the photos in the HTML, so images start downloading on first paint
 * instead of after a client fetch of every project.
 */
export default async function PlacePage({ params }: Props) {
  const { slug } = await params;
  const places = placesWithSortedPhotos(await getPlacesForRender());
  const index = places.findIndex((p) => p.slug === slug);
  if (index < 0) notFound();
  const place = places[index]!;
  const next = places.length > 1 ? places[(index + 1) % places.length] : undefined;

  const photos = sortPhotosByOrder(place.photos).map(({ id, src, thumbnail, alt, width, height }) => ({
    id,
    src,
    thumbnail,
    alt,
    width,
    height,
  }));

  return (
    <div className={portfolioStyles.pageRoot}>
      <ResponsiveGallery
        photos={photos}
        title={place.name}
        location={place.location}
        isProject
        nextProject={
          next
            ? {
                slug: next.slug,
                name: next.name,
                location: next.location,
                cover: next.photos[0]?.src || next.coverImage || '',
                label: 'Next project',
              }
            : undefined
        }
      />
    </div>
  );
}
