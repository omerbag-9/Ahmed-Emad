import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAuthenticated } from '@/lib/auth';
import { patchAboutContent } from '@/lib/about';
import { isCloudinaryConfigured, uploadWebpBuffer } from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60;

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'about');
const CLOUD_FOLDER = 'ahmedemad/about';

export async function POST(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('photo');
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    const id = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());

    const webpBuffer = await sharp(buffer)
      .rotate()
      .resize({
        width: 1400,
        height: 1800,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    const meta = await sharp(webpBuffer).metadata();

    if (isCloudinaryConfigured()) {
      const up = await uploadWebpBuffer({
        buffer: webpBuffer,
        folder: CLOUD_FOLDER,
        publicId: id,
      });
      const updated = await patchAboutContent({
        imageSrc: up.secureUrl,
        imageCloudinaryPublicId: up.publicId,
      });
      revalidatePath('/about');
      return NextResponse.json({
        about: updated,
        width: meta.width,
        height: meta.height,
      });
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const fileName = `${id}.webp`;
    const outPath = path.join(UPLOAD_DIR, fileName);
    await fs.promises.writeFile(outPath, webpBuffer);

    const publicPath = `/uploads/about/${fileName}`;
    const updated = await patchAboutContent({ imageSrc: publicPath });
    revalidatePath('/about');

    return NextResponse.json({
      about: updated,
      width: meta.width,
      height: meta.height,
    });
  } catch (error) {
    console.error('About upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
