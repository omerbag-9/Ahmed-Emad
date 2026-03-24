import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { revalidateAfterPlacesChange } from '@/lib/revalidatePublic';
import { addPhotosToPlace, getPlaceById } from '@/lib/data';
import { isCloudinaryConfigured, thumbnailDeliveryUrl, uploadWebpBuffer } from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60;

export async function POST(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const placeId = formData.get('placeId') as string;
    const files = formData.getAll('photos') as File[];

    if (!placeId) {
      return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
    }

    const place = await getPlaceById(placeId);
    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const useCloud = isCloudinaryConfigured();
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'places', place.slug);
    if (!useCloud) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // ahmedemad/<project-slug>/ — slug is derived from the project name
    const cloudFolder = `ahmedemad/${place.slug}`;
    const photos = [];

    for (const file of files) {
      const id = uuidv4();
      const buffer = Buffer.from(await file.arrayBuffer());

      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 1920;
      const height = metadata.height || 1080;

      const mainBuf = await sharp(buffer)
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const processedMeta = await sharp(mainBuf).metadata();

      if (useCloud) {
        const mainUp = await uploadWebpBuffer({
          buffer: mainBuf,
          folder: cloudFolder,
          publicId: id,
        });
        photos.push({
          id,
          src: mainUp.secureUrl,
          thumbnail: thumbnailDeliveryUrl(mainUp.publicId),
          cloudinary: { main: mainUp.publicId },
          alt: file.name.replace(/\.[^.]+$/, ''),
          width: processedMeta.width || width,
          height: processedMeta.height || height,
        });
      } else {
        const thumbBuf = await sharp(buffer)
          .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 70 })
          .toBuffer();

        const mainFileName = `${id}.webp`;
        const mainPath = path.join(uploadDir, mainFileName);
        await fs.promises.writeFile(mainPath, mainBuf);

        const thumbFileName = `${id}_thumb.webp`;
        const thumbPath = path.join(uploadDir, thumbFileName);
        await fs.promises.writeFile(thumbPath, thumbBuf);

        photos.push({
          id,
          src: `/uploads/places/${place.slug}/${mainFileName}`,
          thumbnail: `/uploads/places/${place.slug}/${thumbFileName}`,
          alt: file.name.replace(/\.[^.]+$/, ''),
          width: processedMeta.width || width,
          height: processedMeta.height || height,
        });
      }
    }

    const updatedPlace = await addPhotosToPlace(placeId, photos);
    revalidateAfterPlacesChange();
    return NextResponse.json(updatedPlace, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
