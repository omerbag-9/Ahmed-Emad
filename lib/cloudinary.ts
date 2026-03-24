import cloudinaryPkg from 'cloudinary';
import { Readable } from 'stream';

const cloudinary = cloudinaryPkg.v2;

/**
 * CLOUDINARY_CLOUD_NAME must be the **Cloud name** from Cloudinary Console → Dashboard
 * (Product Environment Credentials), e.g. `dxxxxxxxx` — not a folder name.
 * The `ahmedemad/...` paths are upload folders only; they are set in the API routes.
 */

let configured = false;

function trimEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : undefined;
}

function ensureConfig(): void {
  if (configured) return;
  const cloud_name = trimEnv('CLOUDINARY_CLOUD_NAME');
  const api_key = trimEnv('CLOUDINARY_API_KEY');
  const api_secret = trimEnv('CLOUDINARY_API_SECRET');
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

export function isCloudinaryConfigured(): boolean {
  return !!(trimEnv('CLOUDINARY_CLOUD_NAME') && trimEnv('CLOUDINARY_API_KEY') && trimEnv('CLOUDINARY_API_SECRET'));
}

/** Thumbnail URL for the same uploaded asset — one Cloudinary file, two URLs (no second upload). */
export function thumbnailDeliveryUrl(publicId: string): string {
  ensureConfig();
  return cloudinary.url(publicId, {
    secure: true,
    width: 400,
    height: 400,
    crop: 'limit',
    fetch_format: 'webp',
  });
}

/** Upload a WebP buffer; returns HTTPS URL and public_id (for destroy). */
export async function uploadWebpBuffer(opts: {
  buffer: Buffer;
  folder: string;
  publicId: string;
}): Promise<{ secureUrl: string; publicId: string }> {
  ensureConfig();
  const { buffer, folder, publicId } = opts;

  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        format: 'webp',
        overwrite: true,
        unique_filename: false,
      },
      (err, res) => {
        if (err) {
          const msg = String((err as { message?: string }).message ?? err);
          if (/invalid cloud_name/i.test(msg)) {
            reject(
              new Error(
                `${msg} — Use the "Cloud name" from your Cloudinary dashboard (not the ahmedemad folder).`
              )
            );
          } else reject(err);
        } else if (!res) reject(new Error('Cloudinary upload returned no result'));
        else resolve(res);
      }
    );
    Readable.from(buffer).pipe(stream);
  });

  return { secureUrl: result.secure_url, publicId: result.public_id };
}

/** Params sent to Cloudinary browser upload must match the signed set (excluding file, api_key). */
export function signImageUploadParams(opts: {
  folder: string;
  publicId: string;
  timestamp: number;
}): string {
  ensureConfig();
  const secret = trimEnv('CLOUDINARY_API_SECRET');
  if (!secret) throw new Error('CLOUDINARY_API_SECRET missing');
  return cloudinary.utils.api_sign_request(
    {
      folder: opts.folder,
      public_id: opts.publicId,
      timestamp: opts.timestamp,
    },
    secret
  );
}

export function getCloudinaryPublicUploadIdentity(): { cloudName: string; apiKey: string } {
  ensureConfig();
  const cloudName = trimEnv('CLOUDINARY_CLOUD_NAME');
  const apiKey = trimEnv('CLOUDINARY_API_KEY');
  if (!cloudName || !apiKey) throw new Error('Cloudinary not configured');
  return { cloudName, apiKey };
}

export async function destroyPublicIds(publicIds: string[]): Promise<void> {
  const ids = publicIds.filter(Boolean);
  if (!ids.length || !isCloudinaryConfigured()) return;
  ensureConfig();
  for (const publicId of ids) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (e) {
      console.warn('Cloudinary destroy failed:', publicId, e);
    }
  }
}
