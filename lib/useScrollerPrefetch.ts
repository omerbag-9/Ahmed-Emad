'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Observe = (el: Element, onNear: () => void) => () => void;

/**
 * Tells gallery tiles when they come within a margin of a horizontal scroller's visible area.
 *
 * Native `loading="lazy"` measures against the page viewport and is clipped by the scroller, so in a
 * sideways gallery an image only starts loading once it is already on screen (the visible pop-in while
 * scrolling). This observer uses the scroller itself as the root with a wide horizontal margin, so the
 * next screens are fetched ahead of the scroll instead of all photos being fetched at once.
 *
 * Each tile keeps its own "near" state, so one tile becoming near re-renders only that tile.
 */
export function useScrollerPrefetch(rootRef: RefObject<HTMLElement | null>): Observe {
  const ioRef = useRef<IntersectionObserver | null>(null);
  const callbacks = useRef(new Map<Element, () => void>());

  useEffect(() => {
    const pending = callbacks.current;
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') {
      pending.forEach((cb) => cb());
      pending.clear();
      return;
    }
    /* At least ~1.25 scroller widths (min 1200px) ahead on either side */
    const margin = Math.round(Math.max(1200, root.clientWidth * 1.25));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const cb = pending.get(entry.target);
          if (!cb) continue;
          pending.delete(entry.target);
          io.unobserve(entry.target);
          cb();
        }
      },
      { root, rootMargin: `0px ${margin}px` }
    );
    ioRef.current = io;
    /* Tiles mount (and register) before this parent effect runs */
    pending.forEach((_, el) => io.observe(el));
    return () => {
      io.disconnect();
      ioRef.current = null;
    };
  }, [rootRef]);

  return useCallback<Observe>((el, onNear) => {
    callbacks.current.set(el, onNear);
    ioRef.current?.observe(el);
    return () => {
      callbacks.current.delete(el);
      ioRef.current?.unobserve(el);
    };
  }, []);
}

/** Per-tile flag: true once the tile is near the scroller viewport (never flips back). */
export function useTileNear<T extends HTMLElement>(observe: Observe, initiallyNear: boolean) {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(initiallyNear);
  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    return observe(el, () => setNear(true));
  }, [near, observe]);
  return [ref, near] as const;
}
