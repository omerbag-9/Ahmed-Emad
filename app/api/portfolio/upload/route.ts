import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { revalidateAfterPortfolioGalleryChange } from '@/lib/revalidatePublic';
import { addPortfolioGalleryPhotos } from '@/lib/portfolio';
import { isCloudinaryConfigured, thumbnailDeliveryUrl, uploadWebpBuffer } from '@/lib/cloudinary';
import { bufferToWebpMainAndThumb, isAllowedImageUpload } from '@/lib/imagePipeline';
import type { Photo } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const maxDuration = 120;

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'portfolio');
const CLOUD_FOLDER = 'ahmedemad/portfolio';

export async function POST(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const useCloud = isCloudinaryConfigured();
    if (!useCloud) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const photos: Omit<Photo, 'order'>[] = [];
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

        if (useCloud) {
          const mainUp = await uploadWebpBuffer({ buffer: mainBuf, folder: CLOUD_FOLDER, publicId: id });
          photos.push({
            id,
            src: mainUp.secureUrl,
            thumbnail: thumbnailDeliveryUrl(mainUp.publicId),
            cloudinary: { main: mainUp.publicId },
            alt: file.name.replace(/\.[^.]+$/, ''),
            width,
            height,
          });
        } else {
          const mainFileName = `${id}.webp`;
          const thumbFileName = `${id}_thumb.webp`;
          await fs.promises.writeFile(path.join(UPLOAD_DIR, mainFileName), mainBuf);
          await fs.promises.writeFile(path.join(UPLOAD_DIR, thumbFileName), thumbBuf);

          photos.push({
            id,
            src: `/uploads/portfolio/${mainFileName}`,
            thumbnail: `/uploads/portfolio/${thumbFileName}`,
            alt: file.name.replace(/\.[^.]+$/, ''),
            width,
            height,
          });
        }
      } catch (err) {
        console.error('Portfolio upload failed:', file.name, err);
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

    const updated = await addPortfolioGalleryPhotos(photos);
    revalidateAfterPortfolioGalleryChange();
    return NextResponse.json(
      skipped.length ? { photos: updated, uploadWarnings: skipped } : { photos: updated },
      { status: 201 }
    );
  } catch (error) {
    console.error('Portfolio upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
