import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { deletePortfolioGalleryPhoto, getPortfolioGalleryPhotos } from '@/lib/portfolio';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { photoId } = await params;
  const ok = await deletePortfolioGalleryPhoto(photoId);
  if (!ok) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }
  return NextResponse.json({ photos: await getPortfolioGalleryPhotos() });
}
