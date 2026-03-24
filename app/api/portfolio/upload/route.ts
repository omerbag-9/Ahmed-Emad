import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { addPortfolioGalleryPhotos } from '@/lib/portfolio';
import { isCloudinaryConfigured, thumbnailDeliveryUrl, uploadWebpBuffer } from '@/lib/cloudinary';
import type { Photo } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

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
        const mainUp = await uploadWebpBuffer({ buffer: mainBuf, folder: CLOUD_FOLDER, publicId: id });
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
        const thumbFileName = `${id}_thumb.webp`;
        await fs.promises.writeFile(path.join(UPLOAD_DIR, mainFileName), mainBuf);
        await fs.promises.writeFile(path.join(UPLOAD_DIR, thumbFileName), thumbBuf);

        photos.push({
          id,
          src: `/uploads/portfolio/${mainFileName}`,
          thumbnail: `/uploads/portfolio/${thumbFileName}`,
          alt: file.name.replace(/\.[^.]+$/, ''),
          width: processedMeta.width || width,
          height: processedMeta.height || height,
        });
      }
    }

    const updated = addPortfolioGalleryPhotos(photos);
    return NextResponse.json({ photos: updated }, { status: 201 });
  } catch (error) {
    console.error('Portfolio upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
