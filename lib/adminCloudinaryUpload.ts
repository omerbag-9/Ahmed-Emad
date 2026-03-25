/**
 * Large photos: browser uploads directly to Cloudinary (signed), then `/api/upload/commit` saves metadata.
 * Only small JSON hits Vercel — avoids the ~4.5MB serverless body limit.
 * Requires CLOUDINARY_* env vars on the server (Vercel). Local dev without Cloudinary falls back to `/api/upload`.
 */
import { v4 as uuidv4 } from 'uuid';

import { prepareImageFileForUpload } from '@/lib/prepareImageFileForUpload';

type SignItem = {
  photoId: string;
  folder: string;
  publicId: string;
  signature: string;
};

type SignOk = {
  useLegacyUpload: false;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  items: SignItem[];
};

async function postFileToCloudinary(
  cloudName: string,
  apiKey: string,
  timestamp: number,
  item: SignItem,
  file: File
): Promise<{ publicId: string; secureUrl: string; width: number; height: number }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', apiKey);
  fd.append('timestamp', String(timestamp));
  fd.append('signature', item.signature);
  fd.append('folder', item.folder);
  fd.append('public_id', item.publicId);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: fd,
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    public_id?: string;
    secure_url?: string;
    width?: number;
    height?: number;
  };
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Cloudinary upload failed (${res.status})`);
  }
  if (
    !data.public_id ||
    !data.secure_url ||
    typeof data.width !== 'number' ||
    typeof data.height !== 'number'
  ) {
    throw new Error('Cloudinary returned an unexpected response');
  }
  return {
    publicId: data.public_id,
    secureUrl: data.secure_url,
    width: data.width,
    height: data.height,
  };
}

async function requestSign(body: Record<string, unknown>): Promise<
  { useLegacyUpload: true } | SignOk
> {
  const res = await fetch('/api/upload/cloudinary-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    useLegacyUpload?: boolean;
    error?: string;
    cloudName?: string;
    apiKey?: string;
    items?: unknown;
  };
  if (!res.ok) {
    throw new Error(json.error || 'Upload sign failed');
  }
  if (json.useLegacyUpload === true) {
    return { useLegacyUpload: true };
  }
  if (!json.cloudName || !json.apiKey || !Array.isArray(json.items)) {
    throw new Error('Invalid sign response from server');
  }
  return json as SignOk;
}

export async function uploadPlacePhotosWithFallback(
  placeId: string,
  files: File[]
): Promise<Response> {
  const prepared = await Promise.all(files.map((f) => prepareImageFileForUpload(f)));
  const photoIds = prepared.map(() => uuidv4());
  const sign = await requestSign({ context: 'place', placeId, photoIds });

  if (sign.useLegacyUpload) {
    const fd = new FormData();
    fd.append('placeId', placeId);
    prepared.forEach((f) => fd.append('photos', f));
    return fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
  }

  const { cloudName, apiKey, timestamp, items } = sign;
  const photos = [];
  for (let i = 0; i < prepared.length; i++) {
    const item = items.find((it) => it.photoId === photoIds[i]);
    if (!item) throw new Error('Sign mismatch');
    const up = await postFileToCloudinary(cloudName, apiKey, timestamp, item, prepared[i]);
    photos.push({
      id: photoIds[i],
      publicId: up.publicId,
      secureUrl: up.secureUrl,
      width: up.width,
      height: up.height,
      alt: prepared[i].name.replace(/\.[^.]+$/, ''),
    });
  }

  return fetch('/api/upload/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ context: 'place', placeId, photos }),
  });
}

export async function uploadPortfolioPhotosWithFallback(files: File[]): Promise<Response> {
  const prepared = await Promise.all(files.map((f) => prepareImageFileForUpload(f)));
  const photoIds = prepared.map(() => uuidv4());
  const sign = await requestSign({ context: 'portfolio', photoIds });

  if (sign.useLegacyUpload) {
    const fd = new FormData();
    prepared.forEach((f) => fd.append('photos', f));
    return fetch('/api/portfolio/upload', { method: 'POST', body: fd, credentials: 'include' });
  }

  const { cloudName, apiKey, timestamp, items } = sign;
  const photos = [];
  for (let i = 0; i < prepared.length; i++) {
    const item = items.find((it) => it.photoId === photoIds[i]);
    if (!item) throw new Error('Sign mismatch');
    const up = await postFileToCloudinary(cloudName, apiKey, timestamp, item, prepared[i]);
    photos.push({
      id: photoIds[i],
      publicId: up.publicId,
      secureUrl: up.secureUrl,
      width: up.width,
      height: up.height,
      alt: prepared[i].name.replace(/\.[^.]+$/, ''),
    });
  }

  return fetch('/api/upload/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ context: 'portfolio', photos }),
  });
}

export async function uploadAboutPhotoWithFallback(file: File): Promise<Response> {
  const prepared = await prepareImageFileForUpload(file);
  const photoId = uuidv4();
  const sign = await requestSign({ context: 'about', photoIds: [photoId] });

  if (sign.useLegacyUpload) {
    const fd = new FormData();
    fd.append('photo', prepared);
    return fetch('/api/about/upload', { method: 'POST', body: fd, credentials: 'include' });
  }

  const { cloudName, apiKey, timestamp, items } = sign;
  const item = items[0];
  if (!item) throw new Error('Sign mismatch');
  const up = await postFileToCloudinary(cloudName, apiKey, timestamp, item, prepared);

  return fetch('/api/upload/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      context: 'about',
      photo: {
        id: photoId,
        publicId: up.publicId,
        secureUrl: up.secureUrl,
        width: up.width,
        height: up.height,
      },
    }),
  });
}
