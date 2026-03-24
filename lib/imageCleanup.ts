import fs from 'fs';
import path from 'path';
import type { Photo } from './types';
import { destroyPublicIds, isCloudinaryConfigured } from './cloudinary';

function unlinkIfPublicRelative(maybeRelative: string): void {
  if (!maybeRelative.startsWith('/')) return;
  const full = path.join(process.cwd(), 'public', maybeRelative.replace(/^\//, ''));
  if (fs.existsSync(full)) fs.unlinkSync(full);
}

/** Remove image files for a place/portfolio photo (Cloudinary and/or local public/). */
export async function removePhotoStoredFiles(photo: Photo): Promise<void> {
  if (photo.cloudinary?.main && isCloudinaryConfigured()) {
    const ids = [photo.cloudinary.main];
    if (photo.cloudinary.thumb && photo.cloudinary.thumb !== photo.cloudinary.main) {
      ids.push(photo.cloudinary.thumb);
    }
    await destroyPublicIds(ids);
    return;
  }
  unlinkIfPublicRelative(photo.src);
  unlinkIfPublicRelative(photo.thumbnail);
}
