import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { addPhotosToPlace, getPlaceById } from '@/lib/data';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

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

    const place = getPlaceById(placeId);
    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'places', place.slug);
    fs.mkdirSync(uploadDir, { recursive: true });

    const photos = [];

    for (const file of files) {
      const id = uuidv4();
      const buffer = Buffer.from(await file.arrayBuffer());

      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 1920;
      const height = metadata.height || 1080;

      // Process main image (max 2000px wide, WebP, quality 80)
      const mainFileName = `${id}.webp`;
      const mainPath = path.join(uploadDir, mainFileName);
      await sharp(buffer)
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(mainPath);

      // Generate thumbnail (400px wide)
      const thumbFileName = `${id}_thumb.webp`;
      const thumbPath = path.join(uploadDir, thumbFileName);
      await sharp(buffer)
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(thumbPath);

      // Calculate aspect ratio for masonry layout
      const processedMeta = await sharp(mainPath).metadata();

      photos.push({
        id,
        src: `/uploads/places/${place.slug}/${mainFileName}`,
        thumbnail: `/uploads/places/${place.slug}/${thumbFileName}`,
        alt: file.name.replace(/\.[^.]+$/, ''),
        width: processedMeta.width || width,
        height: processedMeta.height || height,
      });
    }

    const updatedPlace = addPhotosToPlace(placeId, photos);
    return NextResponse.json(updatedPlace, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
