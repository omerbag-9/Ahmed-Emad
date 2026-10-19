import { getPlacesForRender, placesWithSortedPhotos } from '@/lib/data';
import LoginForm from './login-form';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  /* A wide photograph from the first project sits beside the form */
  const first = placesWithSortedPhotos(await getPlacesForRender()).find((p) => p.photos.length);
  const photo = first ? first.photos.find((ph) => ph.width > ph.height) ?? first.photos[0] : undefined;
  return (
    <LoginForm
      photo={
        photo && first
          ? { src: photo.src, width: photo.width, caption: [first.name, first.location?.trim()].filter(Boolean).join(', ') }
          : undefined
      }
    />
  );
}
