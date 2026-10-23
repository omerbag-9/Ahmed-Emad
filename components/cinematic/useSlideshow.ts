'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SlidePhoto {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  width: number;
  height: number;
}

/** Props shared by every slideshow look, so ResponsiveGallery can swap them freely */
export interface SlideshowProps {
  photos: SlidePhoto[];
  /** Toolbar: return to masonry/grid view */
  onSwitchToGrid?: () => void;
  /** After opening from grid, start on this photo */
  initialFocusPhotoId?: string | null;
  /** Project name and place, for looks that title the show */
  title?: string;
  location?: string;
}

export async function toggleFullscreen(el: HTMLElement | null): Promise<void> {
  if (!el || typeof document === 'undefined') return;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    const req =
      el.requestFullscreen?.bind(el) ??
      (el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.bind(el);
    if (req) await req();
  } catch {
    /* ignore */
  }
}

export function useFullscreenFlag(): boolean {
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  return fullscreen;
}

/** Index ± offset, wrapping round both ends */
export function wrapIndex(i: number, count: number): number {
  return ((i % count) + count) % count;
}

/**
 * One-photo-at-a-time slideshow state: the current index, the direction of the last move (for
 * directional transitions) and keyboard control (← → step, Esc back to grid, F fullscreen).
 * Steps wrap round, so the show never dead-ends.
 */
export function useSlideshow({
  photos,
  initialFocusPhotoId,
  onSwitchToGrid,
  wrapRef,
}: SlideshowProps & { wrapRef: RefObject<HTMLElement | null> }) {
  const count = photos.length;
  const [state, setState] = useState<{ index: number; dir: 1 | -1 }>(() => ({
    index: Math.max(0, initialFocusPhotoId ? photos.findIndex((p) => p.id === initialFocusPhotoId) : 0),
    dir: 1,
  }));
  /* The list can shrink under us (admin edits): never point past its end */
  const index = Math.min(state.index, Math.max(0, count - 1));

  /** Move by `step` (±1), or jump to `to` when given */
  const move = useCallback(
    (step: number, to?: number) => {
      if (count < 2) return;
      setState((s) => {
        const from = Math.min(s.index, count - 1);
        const target = wrapIndex(to ?? from + step, count);
        if (target === from) return s;
        return { index: target, dir: (to == null ? step : target - from) > 0 ? 1 : -1 };
      });
    },
    [count]
  );
  const go = useCallback((to: number) => move(0, to), [move]);
  const next = useCallback(() => move(1), [move]);
  const prev = useCallback(() => move(-1), [move]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Escape' && !document.fullscreenElement) {
        onSwitchToGrid?.();
      } else if (e.key === 'f' || e.key === 'F') {
        void toggleFullscreen(wrapRef.current);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [next, prev, onSwitchToGrid, wrapRef]);

  return { index, dir: state.dir, go, next, prev, count };
}

/** A swipe has to travel this far (px) to change slide */
const SWIPE_MIN = 40;
/** Wheel: one step per gesture, then ignore the trackpad's momentum tail for this long */
const WHEEL_LOCK_MS = 650;
const WHEEL_MIN = 30;

/**
 * Swipes (any direction: left/up = forward), mouse drags and wheel/trackpad gestures step a
 * one-photo slideshow. Elements marked `data-ae-no-pan-scroll` (buttons) keep their clicks.
 */
export function useSwipeStep(ref: RefObject<HTMLElement | null>, onNext: () => void, onPrev: () => void) {
  const cb = useRef({ onNext, onPrev });
  useEffect(() => {
    cb.current = { onNext, onPrev };
  }, [onNext, onPrev]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    let active = false;
    let wheelAcc = 0;
    let wheelLockUntil = 0;

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-ae-no-pan-scroll],button,a')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      active = true;
      sx = e.clientX;
      sy = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(d) < SWIPE_MIN) return;
      if (d < 0) cb.current.onNext();
      else cb.current.onPrev();
    };
    const onCancel = () => {
      active = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now < wheelLockUntil) {
        wheelLockUntil = now + 120; /* still in the momentum tail */
        return;
      }
      wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(wheelAcc) < WHEEL_MIN) return;
      if (wheelAcc > 0) cb.current.onNext();
      else cb.current.onPrev();
      wheelAcc = 0;
      wheelLockUntil = now + WHEEL_LOCK_MS;
    };

    el.addEventListener('pointerdown', onDown);
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onCancel);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      removeEventListener('pointerup', onUp);
      removeEventListener('pointercancel', onCancel);
      el.removeEventListener('wheel', onWheel);
    };
  }, [ref]);
}
