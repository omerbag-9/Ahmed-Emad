import { checkAdminAuth } from '@/lib/check-auth';
import { notFound } from 'next/navigation';
import { getPlaceById, sortPhotosByOrder } from '@/lib/data';
import ProjectEditor from './project-editor';

export default async function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  /* Layout and page render in parallel: guard here too so no data is fetched without a session */
  await checkAdminAuth();
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) notFound();
  return (
    <ProjectEditor
      place={{
        id: place.id,
        slug: place.slug,
        name: place.name,
        location: place.location || '',
        brief: place.brief || '',
        description: place.description || '',
        photos: sortPhotosByOrder(place.photos).map(({ id: pid, src, thumbnail, alt }) => ({ id: pid, src, thumbnail, alt })),
      }}
    />
  );
}
