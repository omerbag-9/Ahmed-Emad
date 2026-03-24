import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAuthenticated } from '@/lib/auth';
import { patchAboutContent } from '@/lib/about';
import { isCloudinaryConfigured, uploadWebpBuffer } from '@/lib/cloudinary';
import { bufferToWebpPortrait, isAllowedImageUpload } from '@/lib/imagePipeline';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const maxDuration = 120;

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

    if (!isAllowedImageUpload(file)) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    const id = uuidv4();
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    let webpBuffer: Buffer;
    let width: number;
    let height: number;
    try {
      const out = await bufferToWebpPortrait(inputBuffer);
      webpBuffer = out.buffer;
      width = out.width;
      height = out.height;
    } catch (err) {
      console.error('About portrait processing failed:', err);
      return NextResponse.json(
        {
          error:
            'Could not process this image. Try another format (JPEG/PNG/WebP) or a smaller file if upload limits apply.',
        },
        { status: 400 }
      );
    }

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
        width,
        height,
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
      width,
      height,
    });
  } catch (error) {
    console.error('About upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
