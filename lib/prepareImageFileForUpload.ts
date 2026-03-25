/**
 * Client-only: re-encode large rasters in the browser so uploads stay under Cloudinary plan limits
 * while keeping high visual quality (WebP, high quality, optional downscale of very large dimensions).
 *
 * Tunables (public so they are available in the browser bundle):
 * - NEXT_PUBLIC_IMAGE_UPLOAD_MAX_BYTES (default 9_437_184 ≈ 9 MiB, safe under common 10 MB caps)
 * - NEXT_PUBLIC_IMAGE_UPLOAD_MAX_EDGE (default 8192 px on longest side)
 */

const DEFAULT_MAX_BYTES = 9_437_184; // 9 MiB
const DEFAULT_MAX_EDGE = 8192;
const MIN_LONG_EDGE = 2400;
const QUALITY_STEPS = [0.95, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68, 0.64, 0.6, 0.56, 0.52, 0.48];

function readMaxBytes(): number {
  const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_IMAGE_UPLOAD_MAX_BYTES : undefined;
  if (!raw) return DEFAULT_MAX_BYTES;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n >= 2_000_000 ? n : DEFAULT_MAX_BYTES;
}

function readMaxEdge(): number {
  const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_IMAGE_UPLOAD_MAX_EDGE : undefined;
  if (!raw) return DEFAULT_MAX_EDGE;
  const n = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n)) return DEFAULT_MAX_EDGE;
  return Math.min(16384, Math.max(2048, n));
}

function baseName(file: File): string {
  const n = file.name.replace(/\.[^.]+$/, '');
  return n || 'photo';
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = url;
  });
}

async function decodeToDimensions(file: File): Promise<{
  close: () => void;
  draw: (ctx: CanvasRenderingContext2D, dw: number, dh: number) => void;
  width: number;
  height: number;
}> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return {
      close: () => bitmap.close(),
      draw: (ctx, dw, dh) => ctx.drawImage(bitmap, 0, 0, dw, dh),
      width: bitmap.width,
      height: bitmap.height,
    };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadHtmlImage(url);
      return {
        close: () => URL.revokeObjectURL(url),
        draw: (ctx, dw, dh) => ctx.drawImage(img, 0, 0, dw, dh),
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/**
 * If the file is already under the byte budget, returns it unchanged (no recompression).
 * Otherwise decodes, optionally downscales long edge, encodes WebP (JPEG fallback) until under budget.
 */
export async function prepareImageFileForUpload(file: File): Promise<File> {
  const maxBytes = readMaxBytes();
  const maxEdge = readMaxEdge();

  const mime = (file.type || '').toLowerCase();
  if (mime === 'image/svg+xml') return file;
  if (!mime.startsWith('image/')) return file;
  if (file.size <= maxBytes) return file;

  let source: Awaited<ReturnType<typeof decodeToDimensions>> | null = null;
  try {
    source = await decodeToDimensions(file);
  } catch {
    return file;
  }

  try {
    let w = source.width;
    let h = source.height;
    if (w < 1 || h < 1) return file;

    let scale = Math.min(1, maxEdge / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    source.draw(ctx, w, h);

    let best: Blob | null = null;

    const tryEncode = async (): Promise<Blob | null> => {
      for (const q of QUALITY_STEPS) {
        let blob = await canvasToBlob(canvas, 'image/webp', q);
        if (!blob || blob.size === 0) {
          blob = await canvasToBlob(canvas, 'image/jpeg', q);
        }
        if (blob && blob.size > 0 && blob.size <= maxBytes) return blob;
        if (blob && blob.size > 0 && (!best || blob.size < best.size)) best = blob;
      }
      return best;
    };

    let blob = await tryEncode();

    while ((!blob || blob.size > maxBytes) && Math.max(w, h) > MIN_LONG_EDGE) {
      const factor = 0.9;
      w = Math.max(1, Math.round(w * factor));
      h = Math.max(1, Math.round(h * factor));
      canvas.width = w;
      canvas.height = h;
      ctx.imageSmoothingQuality = 'high';
      source.draw(ctx, w, h);
      blob = await tryEncode();
    }

    if (!blob || blob.size === 0) return file;

    if (blob.size > maxBytes) {
      const aggressive = await canvasToBlob(canvas, 'image/jpeg', 0.42);
      if (aggressive && aggressive.size > 0) blob = aggressive;
    }

    if (!blob || blob.size === 0) return file;

    const outType = blob.type || 'image/webp';
    const ext = outType.includes('jpeg') || outType.includes('jpg') ? '.jpg' : '.webp';
    return new File([blob], `${baseName(file)}${ext}`, { type: outType });
  } finally {
    source.close();
  }
}
