import { NextResponse } from 'next/server';
import { getPlaceById, updatePlace, deletePlace, placesWithSortedPhotos } from '@/lib/data';
import { isAuthenticated } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const place = getPlaceById(id);
  if (!place) {
    return NextResponse.json({ error: 'Place not found' }, { status: 404 });
  }
  const [sorted] = placesWithSortedPhotos([place]);
  return NextResponse.json(sorted);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const updates = await request.json();
    const place = updatePlace(id, updates);
    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }
    return NextResponse.json(place);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const success = deletePlace(id);
  if (!success) {
    return NextResponse.json({ error: 'Place not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
