/**
 * Grid tiles use `unoptimized` Next/Image + Cloudinary URLs, so the browser decodes the full
 * file and scales with CSS — that reads as grain/noise after load while progressive decode
 * looks softer. We add `c_limit,w_*` so Cloudinary serves ~display-sized pixels, plus `q_auto`.
 */
export function cloudinaryGridImageSrc(src: string, landscape: boolean): string {
  const s = (src || '').trim();
  if (!s.includes('res.cloudinary.com') || !/\/image\/upload\//.test(s)) return s;

  const pathOnly = s.split('?')[0] ?? s;
  const hasWidthCap = /\bc_limit\b[^/?]*\bw_\d+/i.test(pathOnly);
  const hasQ = pathOnly.includes('q_auto') || /\/q_\d+/.test(pathOnly);

  if (hasWidthCap && hasQ) return s;

  const q = landscape ? 'q_auto:best' : 'q_auto:good';
  /** ~2× largest typical cell width @2x DPR; c_limit avoids upscaling small originals */
  const dim = landscape ? 'c_limit,w_2000' : 'c_limit,w_1200';
  const bundle = `${q},${dim}`;

  const afterQUpgrade = s.replace(
    /\/image\/upload\/q_auto:(?:good|best)\//,
    `/image/upload/${bundle}/`
  );
  if (afterQUpgrade !== s) return afterQUpgrade;

  const afterVersion = s.replace(/\/image\/upload\/(v\d+\/)/, `/image/upload/${bundle}/$1`);
  if (afterVersion !== s) return afterVersion;

  return s;
}
