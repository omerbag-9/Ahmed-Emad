import { NextResponse } from 'next/server';
import { reorderPlacePhotos, placesWithSortedPhotos } from '@/lib/data';
import { isAuthenticated } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { orderedPhotoIds } = body as { orderedPhotoIds?: string[] };
    if (!Array.isArray(orderedPhotoIds)) {
      return NextResponse.json({ error: 'orderedPhotoIds array required' }, { status: 400 });
    }

    const place = await reorderPlacePhotos(id, orderedPhotoIds);
    if (!place) {
      return NextResponse.json({ error: 'Invalid place or photo list' }, { status: 400 });
    }

    const [sorted] = placesWithSortedPhotos([place]);
    return NextResponse.json(sorted);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
