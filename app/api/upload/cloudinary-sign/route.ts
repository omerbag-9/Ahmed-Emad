import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getPlaceById } from '@/lib/data';
import {
  isCloudinaryConfigured,
  getCloudinaryPublicUploadIdentity,
  signImageUploadParams,
} from '@/lib/cloudinary';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

function validIds(ids: unknown, max: number): ids is string[] {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > max) return false;
  return ids.every(
    (id) => typeof id === 'string' && uuidValidate(id) && uuidVersion(id) === 4
  );
}

/**
 * Small JSON-only: signs per-file Cloudinary params so the browser can POST huge files
 * directly to Cloudinary (bypasses Vercel ~4.5MB serverless body limit).
 */
export async function POST(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    // On Vercel, multipart uploads hit the ~4.5MB serverless body limit — direct Cloudinary is required.
    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            'Cloudinary is not configured. Large uploads must go browser → Cloudinary. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to this Vercel project, then redeploy.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ useLegacyUpload: true as const });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const context = o.context;
  const photoIds = o.photoIds;

  if (!validIds(photoIds, 40)) {
    return NextResponse.json({ error: 'photoIds must be 1–40 UUIDs' }, { status: 400 });
  }

  const timestamp = Math.round(Date.now() / 1000);

  try {
    const { cloudName, apiKey } = getCloudinaryPublicUploadIdentity();

    if (context === 'place') {
      const placeId = o.placeId;
      if (typeof placeId !== 'string' || !placeId.trim()) {
        return NextResponse.json({ error: 'placeId required' }, { status: 400 });
      }
      const place = await getPlaceById(placeId.trim());
      if (!place) {
        return NextResponse.json({ error: 'Place not found' }, { status: 404 });
      }
      const folder = `ahmedemad/${place.slug}`;
      const items = photoIds.map((publicId) => ({
        photoId: publicId,
        folder,
        publicId,
        signature: signImageUploadParams({ folder, publicId, timestamp }),
      }));
      return NextResponse.json({
        useLegacyUpload: false as const,
        cloudName,
        apiKey,
        timestamp,
        items,
      });
    }

    if (context === 'portfolio') {
      const folder = 'ahmedemad/portfolio';
      const items = photoIds.map((publicId) => ({
        photoId: publicId,
        folder,
        publicId,
        signature: signImageUploadParams({ folder, publicId, timestamp }),
      }));
      return NextResponse.json({
        useLegacyUpload: false as const,
        cloudName,
        apiKey,
        timestamp,
        items,
      });
    }

    if (context === 'about') {
      if (photoIds.length !== 1) {
        return NextResponse.json({ error: 'About upload expects exactly one photoId' }, { status: 400 });
      }
      const folder = 'ahmedemad/about';
      const publicId = photoIds[0];
      const items = [
        {
          photoId: publicId,
          folder,
          publicId,
          signature: signImageUploadParams({ folder, publicId, timestamp }),
        },
      ];
      return NextResponse.json({
        useLegacyUpload: false as const,
        cloudName,
        apiKey,
        timestamp,
        items,
      });
    }

    return NextResponse.json({ error: 'Invalid context' }, { status: 400 });
  } catch (e) {
    console.error('cloudinary-sign:', e);
    return NextResponse.json({ error: 'Could not sign upload' }, { status: 500 });
  }
}
