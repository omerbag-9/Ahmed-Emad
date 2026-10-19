/**
 * Responsive Cloudinary delivery for gallery photos.
 *
 * Sending every visitor the full original (often 6–8k px) made the grid and strip decode tens of
 * huge bitmaps at once, which is what caused the slow loads and scroll lag. Instead the browser gets
 * a `srcset` and picks the smallest file that still covers every device pixel of the tile:
 *
 * - Below the photo's native width: a Cloudinary downscale (`c_limit`, never upscales) at
 *   `q_auto:best`, Cloudinary's highest automatic quality, in the original file format.
 * - At or above native width (big or high-DPR screens, fullscreen): the untouched original file.
 *
 * So on-screen sharpness is unchanged: each tile still receives at least as many pixels as it
 * displays, and the original whenever the screen can show all of it.
 */

/** Quality for downscaled variants; switch to 'q_100' if you ever want lossless-level re-encodes. */
export const CLOUDINARY_DOWNSCALE_QUALITY = 'q_auto:best';

/** Width ladder (matches `images.deviceSizes` in next.config.ts) so CDN-cached variants are reused. */
export const GALLERY_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3072, 3840] as const;

const UPLOAD_SEGMENT = '/image/upload/';

export function isCloudinaryUploadSrc(src: string): boolean {
  return src.startsWith('https://res.cloudinary.com/') && src.includes(UPLOAD_SEGMENT);
}

function cloudinaryDownscaleUrl(src: string, width: number): string {
  const i = src.indexOf(UPLOAD_SEGMENT) + UPLOAD_SEGMENT.length;
  return `${src.slice(0, i)}c_limit,w_${width},${CLOUDINARY_DOWNSCALE_QUALITY}/${src.slice(i)}`;
}

/** One downscaled Cloudinary file (thumbnails, previews); non-Cloudinary sources are returned as-is. */
export function cloudinaryWidth(src: string, width: number): string {
  return isCloudinaryUploadSrc(src) ? cloudinaryDownscaleUrl(src, width) : src;
}

/**
 * A ~1 KB, 32px-wide version shown blurred under a photo until the real file has loaded, so a tile
 * is never an empty box. Undefined for non-Cloudinary sources (local dev uploads).
 */
export function cloudinaryPlaceholder(src: string): string | undefined {
  if (!isCloudinaryUploadSrc(src)) return undefined;
  const i = src.indexOf(UPLOAD_SEGMENT) + UPLOAD_SEGMENT.length;
  return `${src.slice(0, i)}c_limit,w_32,q_30,f_auto/${src.slice(i)}`;
}

/**
 * `srcset` for a gallery photo, or undefined when the source is not a Cloudinary upload
 * (local dev uploads are served as-is).
 */
export function gallerySrcSet(src: string, naturalWidth: number): string | undefined {
  if (!isCloudinaryUploadSrc(src) || !(naturalWidth > 0)) return undefined;
  const entries = GALLERY_WIDTHS.filter((w) => w < naturalWidth).map(
    (w) => `${cloudinaryDownscaleUrl(src, w)} ${w}w`
  );
  entries.push(`${src} ${Math.round(naturalWidth)}w`);
  return entries.join(', ');
}

/**
 * `sizes` for a tile whose height is at most `maxHeightVh` of the viewport and whose box is at least
 * `minWidthVh` wide, with the photo filling it via `object-fit: cover`. A cover-fitted photo is drawn
 * at max(box width, box height × aspect ratio), so that is what the browser must budget for.
 * Gallery stages never exceed the viewport height, so these are upper bounds: the chosen file is
 * never smaller than what is displayed.
 */
export function coverSizesVh(
  naturalWidth: number,
  naturalHeight: number,
  maxHeightVh: number,
  minWidthVh = 0
): string {
  const ratio = Math.max(naturalWidth, 1) / Math.max(naturalHeight, 1);
  return `${Math.ceil(Math.max(minWidthVh, maxHeightVh * ratio))}vh`;
}
