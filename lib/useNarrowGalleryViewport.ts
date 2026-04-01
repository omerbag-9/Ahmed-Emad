'use client';

import { useSyncExternalStore } from 'react';

/** Matches ResponsiveGallery / portfolio layout mobile breakpoint */
const NARROW_MQ = '(max-width: 900px)';

function subscribeNarrowGallery(onChange: () => void) {
  const mq = window.matchMedia(NARROW_MQ);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getNarrowGallerySnapshot() {
  return window.matchMedia(NARROW_MQ).matches;
}

function getNarrowGalleryServerSnapshot() {
  return false;
}

/**
 * True on narrow viewports: grid + slider load every image eagerly (no lazy) so swipe/scroll
 * does not re-trigger loading.
 */
export function useNarrowGalleryViewport(): boolean {
  return useSyncExternalStore(
    subscribeNarrowGallery,
    getNarrowGallerySnapshot,
    getNarrowGalleryServerSnapshot
  );
}
