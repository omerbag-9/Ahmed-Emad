import sharp from 'sharp';
import { acceptImageFile } from './acceptImageFile';

/**
 * Sharp defaults reject many real-world files (minor JPEG issues, huge panos, animated GIF/WebP).
 * These options favor “accept the upload” over strict validation.
 */
const INPUT_OPTIONS: sharp.SharpOptions = {
  failOn: 'none',
  /** ~1.1 gigapixels — very large stitched panos; still bounded vs unlimited */
  limitInputPixels: 1_200_000_000,
  /** Single frame only — avoids multi-frame / animated decode failures */
  animated: false,
  sequentialRead: true,
};

function basePipeline(buffer: Buffer): sharp.Sharp {
  return sharp(buffer, INPUT_OPTIONS).rotate();
}

async function toWebp(
  buffer: Buffer,
  resize: { width: number; height: number; fit: 'inside'; withoutEnlargement: boolean },
  quality: number,
  effort: number
): Promise<Buffer> {
  const encode = (toSrgb: boolean) =>
    (toSrgb ? basePipeline(buffer).toColorspace('srgb') : basePipeline(buffer))
      .resize(resize)
      .webp({ quality, effort, smartSubsample: true })
      .toBuffer();
  try {
    return await encode(true);
  } catch {
    return await encode(false);
  }
}

export type MainThumbResult = {
  main: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
};

/**
 * Main gallery image + thumbnail as WebP. Large `mainMax` keeps quality on big screens;
 * images are never upscaled.
 */
export async function bufferToWebpMainAndThumb(
  buffer: Buffer,
  opts?: { mainMax?: number; thumbMax?: number; qualityMain?: number; qualityThumb?: number }
): Promise<MainThumbResult> {
  const mainMax = opts?.mainMax ?? 8192;
  const thumbMax = opts?.thumbMax ?? 800;
  const qualityMain = opts?.qualityMain ?? 82;
  const qualityThumb = opts?.qualityThumb ?? 72;
  const effort = 3;

  const resizeMain = {
    width: mainMax,
    height: mainMax,
    fit: 'inside' as const,
    withoutEnlargement: true,
  };
  const resizeThumb = {
    width: thumbMax,
    height: thumbMax,
    fit: 'inside' as const,
    withoutEnlargement: true,
  };

  const meta = await basePipeline(buffer).metadata();
  const srcW = meta.width ?? 1920;
  const srcH = meta.height ?? 1080;

  const [main, thumb] = await Promise.all([
    toWebp(buffer, resizeMain, qualityMain, effort),
    toWebp(buffer, resizeThumb, qualityThumb, effort),
  ]);

  const outMeta = await sharp(main).metadata();
  return {
    main,
    thumb,
    width: outMeta.width ?? srcW,
    height: outMeta.height ?? srcH,
  };
}

/** About-page portrait: modest max dimensions, WebP output */
export async function bufferToWebpPortrait(
  buffer: Buffer,
  opts?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const maxWidth = opts?.maxWidth ?? 2400;
  const maxHeight = opts?.maxHeight ?? 3000;
  const quality = opts?.quality ?? 82;

  const meta = await basePipeline(buffer).metadata();
  const srcW = meta.width ?? 1920;
  const srcH = meta.height ?? 1080;

  const out = await toWebp(
    buffer,
    {
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    },
    quality,
    3
  );

  const outMeta = await sharp(out).metadata();
  return {
    buffer: out,
    width: outMeta.width ?? srcW,
    height: outMeta.height ?? srcH,
  };
}

/** Server-side gate before reading buffer (same rules as client file picker) */
export function isAllowedImageUpload(file: File): boolean {
  if (!file || file.size === 0) return false;
  return acceptImageFile(file);
}
