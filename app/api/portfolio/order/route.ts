import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getPortfolioGalleryPhotos, reorderPortfolioPhotos } from '@/lib/portfolio';

export async function PATCH(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderedPhotoIds } = body as { orderedPhotoIds?: string[] };
    if (!Array.isArray(orderedPhotoIds)) {
      return NextResponse.json({ error: 'orderedPhotoIds array required' }, { status: 400 });
    }
    const ok = await reorderPortfolioPhotos(orderedPhotoIds);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid photo order' }, { status: 400 });
    }
    return NextResponse.json({ photos: await getPortfolioGalleryPhotos() });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
