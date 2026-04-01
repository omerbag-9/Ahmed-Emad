/**
 * Single source for grid + horizontal strip behavior.
 * Portfolio index and project pages share these values so quality, lazy windows, and scroll paths match.
 */

export const GRID_IMAGE_SIZES_LANDSCAPE =
  '(min-width: 1400px) 920px, (min-width: 901px) 72vw, 92vw';

export const GRID_IMAGE_SIZES_PORTRAIT =
  '(min-width: 1400px) 400px, (min-width: 901px) 30vw, 42vw';

export const GRID_IMAGE_QUALITY_PORTRAIT = 86;
export const GRID_IMAGE_QUALITY_LANDSCAPE = 88;

/** Desktop masonry: eager-load first N tiles (same cap for portfolio and projects). */
export const GRID_DESKTOP_EAGER_COUNT = 12;

export function gridImageSizes(landscape: boolean): string {
  return landscape ? GRID_IMAGE_SIZES_LANDSCAPE : GRID_IMAGE_SIZES_PORTRAIT;
}

/** Strip cells fill gallery height; width ≈ height × (w/h). Px hint avoids understating wide slides. */
export const STRIP_SIZES_BASE_HEIGHT_PX = 1150;
export const STRIP_SIZES_MAX_PX = 3840;

export function stripSlideSizes(naturalW: number, naturalH: number): string {
  const ar = naturalW / Math.max(naturalH, 1);
  const estCssWidth = Math.min(
    STRIP_SIZES_MAX_PX,
    Math.ceil(STRIP_SIZES_BASE_HEIGHT_PX * ar)
  );
  return `${estCssWidth}px`;
}

/** Beyond this on desktop, lazy + edge priority so the strip does not fetch everything at once. */
export const STRIP_EAGER_LOADING_MAX = 96;

/** Above this: native <img> + layout cache (Next/Image × N hurts scroll on large sets). */
export const HEAVY_STRIP_THRESHOLD = 22;
