import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { revalidateAfterPlacesChange } from '@/lib/revalidatePublic';
import { addPhotosToPlace, getPlaceById } from '@/lib/data';
import { isCloudinaryConfigured, thumbnailDeliveryUrl, uploadWebpBuffer } from '@/lib/cloudinary';
import { bufferToWebpMainAndThumb, isAllowedImageUpload } from '@/lib/imagePipeline';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const maxDuration = 120;

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

    const cloudFolder = `ahmedemad/${place.slug}`;
    const photos = [];
    const skipped: string[] = [];

    for (const file of files) {
      if (!isAllowedImageUpload(file)) {
        skipped.push(file.name || 'unnamed');
        continue;
      }
      try {
        const id = uuidv4();
        const buffer = Buffer.from(await file.arrayBuffer());
        const { main: mainBuf, thumb: thumbBuf, width, height } =
          await bufferToWebpMainAndThumb(buffer);

        const processedMeta = { width, height };

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
            width: processedMeta.width,
            height: processedMeta.height,
          });
        } else {
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
            width: processedMeta.width,
            height: processedMeta.height,
          });
        }
      } catch (err) {
        console.error('Place photo upload failed:', file.name, err);
        skipped.push(file.name || 'unnamed');
      }
    }

    if (photos.length === 0) {
      return NextResponse.json(
        {
          error: 'No images could be processed. Try JPEG or PNG, or reduce file size if the request is very large.',
          skipped,
        },
        { status: 400 }
      );
    }

    const updatedPlace = await addPhotosToPlace(placeId, photos);
    revalidateAfterPlacesChange();
    return NextResponse.json(
      skipped.length ? { ...updatedPlace, uploadWarnings: skipped } : updatedPlace,
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
