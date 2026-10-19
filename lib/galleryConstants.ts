/**
 * Single source for grid + horizontal strip behavior.
 * Portfolio index and project pages share these values so quality, loading windows, and scroll paths match.
 */

/*
 * Grid geometry (MasonryGrid.module.css): two rows filling the gallery stage, which is never taller
 * than the viewport. Row height ≤ 50vh; a portrait column is 3/8 of the stage height (≤ 37.5vh) and a
 * landscape tile spans two columns (≤ 75vh + gap). These upper bounds feed `sizes`, so the browser
 * never picks a file smaller than the tile it fills.
 */
export const GRID_ROW_MAX_HEIGHT_VH = 50;
export const GRID_PORTRAIT_CELL_MAX_WIDTH_VH = 37.5;
export const GRID_LANDSCAPE_CELL_MAX_WIDTH_VH = 76;

/** Tiles fetched immediately on first paint; the rest load as they approach the visible area. */
export const GRID_INITIAL_EAGER_COUNT = 12;
/** First tiles get `fetchpriority="high"` (above the fold on every layout). */
export const GRID_HIGH_PRIORITY_COUNT = 4;

/** Strip cells fill the strip height (≤ the viewport); width = height × aspect ratio. */
export const STRIP_MAX_HEIGHT_VH = 100;
/** Slides fetched immediately when the strip opens (around the focused photo when there is one). */
export const STRIP_INITIAL_EAGER_RADIUS = 2;
