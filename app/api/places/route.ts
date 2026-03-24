import { NextResponse } from 'next/server';
import {
  getPlaces,
  createPlace,
  getCategories,
  placesWithSortedPhotos,
  reorderPlaces,
} from '@/lib/data';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  const places = placesWithSortedPhotos(await getPlaces());
  const categories = await getCategories();
  return NextResponse.json({ places, categories });
}

export async function POST(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, category, brief, description, location } = await request.json();

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
    }

    const place = await createPlace(
      name,
      category,
      description || '',
      typeof location === 'string' ? location : '',
      typeof brief === 'string' ? brief : ''
    );
    return NextResponse.json(place, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderedPlaceIds } = body as { orderedPlaceIds?: string[] };
    if (!Array.isArray(orderedPlaceIds)) {
      return NextResponse.json({ error: 'orderedPlaceIds array required' }, { status: 400 });
    }
    const ok = await reorderPlaces(orderedPlaceIds);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid place order' }, { status: 400 });
    }
    const places = placesWithSortedPhotos(await getPlaces());
    const categories = await getCategories();
    return NextResponse.json({ places, categories });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
