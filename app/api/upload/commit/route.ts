import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { revalidateAfterPlacesChange, revalidateAfterPortfolioGalleryChange } from '@/lib/revalidatePublic';
import { getPlaceById, addPhotosToPlace } from '@/lib/data';
import { addPortfolioGalleryPhotos } from '@/lib/portfolio';
import { patchAboutContent } from '@/lib/about';
import { thumbnailDeliveryUrl } from '@/lib/cloudinary';
import { revalidatePath } from 'next/cache';
import type { Photo } from '@/lib/types';

type CommitPhoto = {
  id: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  alt?: string;
};

function assertDims(w: unknown, h: unknown): boolean {
  return typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0 && w < 50000 && h < 50000;
}

/**
 * Registers photos after browser → Cloudinary direct upload (small JSON only).
 */
export async function POST(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const context = o.context;

  if (context === 'place') {
    const placeId = o.placeId;
    if (typeof placeId !== 'string' || !placeId.trim()) {
      return NextResponse.json({ error: 'placeId required' }, { status: 400 });
    }
    const place = await getPlaceById(placeId.trim());
    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }
    const prefix = `ahmedemad/${place.slug}/`;
    const rawPhotos = o.photos;
    if (!Array.isArray(rawPhotos) || rawPhotos.length === 0) {
      return NextResponse.json({ error: 'photos required' }, { status: 400 });
    }
    const photos: Omit<Photo, 'order'>[] = [];
    for (const row of rawPhotos) {
      const p = row as CommitPhoto;
      if (typeof p.id !== 'string' || typeof p.publicId !== 'string' || typeof p.secureUrl !== 'string') {
        return NextResponse.json({ error: 'Invalid photo row' }, { status: 400 });
      }
      if (!p.publicId.startsWith(prefix) || p.publicId !== `${prefix}${p.id}`) {
        return NextResponse.json({ error: 'publicId does not match place' }, { status: 400 });
      }
      if (!assertDims(p.width, p.height)) {
        return NextResponse.json({ error: 'Invalid dimensions' }, { status: 400 });
      }
      photos.push({
        id: p.id,
        src: p.secureUrl,
        thumbnail: thumbnailDeliveryUrl(p.publicId),
        alt: (typeof p.alt === 'string' ? p.alt : '').replace(/\.[^.]+$/, '') || 'Photo',
        width: p.width,
        height: p.height,
        cloudinary: { main: p.publicId },
      });
    }
    const updated = await addPhotosToPlace(place.id, photos);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to save photos' }, { status: 500 });
    }
    revalidateAfterPlacesChange();
    return NextResponse.json(updated);
  }

  if (context === 'portfolio') {
    const prefix = 'ahmedemad/portfolio/';
    const rawPhotos = o.photos;
    if (!Array.isArray(rawPhotos) || rawPhotos.length === 0) {
      return NextResponse.json({ error: 'photos required' }, { status: 400 });
    }
    const photos: Omit<Photo, 'order'>[] = [];
    for (const row of rawPhotos) {
      const p = row as CommitPhoto;
      if (typeof p.id !== 'string' || typeof p.publicId !== 'string' || typeof p.secureUrl !== 'string') {
        return NextResponse.json({ error: 'Invalid photo row' }, { status: 400 });
      }
      if (!p.publicId.startsWith(prefix) || p.publicId !== `${prefix}${p.id}`) {
        return NextResponse.json({ error: 'publicId does not match portfolio folder' }, { status: 400 });
      }
      if (!assertDims(p.width, p.height)) {
        return NextResponse.json({ error: 'Invalid dimensions' }, { status: 400 });
      }
      photos.push({
        id: p.id,
        src: p.secureUrl,
        thumbnail: thumbnailDeliveryUrl(p.publicId),
        alt: (typeof p.alt === 'string' ? p.alt : '').replace(/\.[^.]+$/, '') || 'Photo',
        width: p.width,
        height: p.height,
        cloudinary: { main: p.publicId },
      });
    }
    const updated = await addPortfolioGalleryPhotos(photos);
    revalidateAfterPortfolioGalleryChange();
    return NextResponse.json({ photos: updated });
  }

  if (context === 'about') {
    const prefix = 'ahmedemad/about/';
    const p = o.photo as CommitPhoto | undefined;
    if (!p || typeof p.publicId !== 'string' || typeof p.secureUrl !== 'string') {
      return NextResponse.json({ error: 'photo required' }, { status: 400 });
    }
    if (!p.publicId.startsWith(prefix) || p.publicId !== `${prefix}${p.id}`) {
      return NextResponse.json({ error: 'publicId does not match about folder' }, { status: 400 });
    }
    if (!assertDims(p.width, p.height)) {
      return NextResponse.json({ error: 'Invalid dimensions' }, { status: 400 });
    }
    const updated = await patchAboutContent({
      imageSrc: p.secureUrl,
      imageCloudinaryPublicId: p.publicId,
    });
    revalidatePath('/about');
    return NextResponse.json({ about: updated, width: p.width, height: p.height });
  }

  return NextResponse.json({ error: 'Invalid context' }, { status: 400 });
}
