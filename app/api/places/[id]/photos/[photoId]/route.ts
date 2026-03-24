import { NextResponse } from 'next/server';
import { deletePhoto } from '@/lib/data';
import { isAuthenticated } from '@/lib/auth';
import { revalidateAfterPlacesChange } from '@/lib/revalidatePublic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, photoId } = await params;
  const success = await deletePhoto(id, photoId);
  if (!success) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }
  revalidateAfterPlacesChange();
  return NextResponse.json({ success: true });
}
