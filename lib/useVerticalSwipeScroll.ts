'use client';

import type { RefObject } from 'react';
import { useEffect } from 'react';

/** Momentum decay per 16ms frame after the finger lifts, and the speed below which it stops (px/ms) */
const FRICTION = 0.95;
const MIN_SPEED = 0.02;
/** Movement before a gesture is read as vertical or horizontal */
const AXIS_SLOP = 6;

/**
 * Touch screens: a vertical swipe scrolls a sideways gallery (swipe up = forward), with momentum,
 * so people who swipe up and down still move through the photos. Horizontal swipes are left to
 * the browser's native scrolling. Pair with `touch-action: pan-x` on the element so the browser
 * hands vertical gestures to this handler instead of trying to scroll the page.
 */
export function useVerticalSwipeScroll(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let axis: 'x' | 'y' | null = null;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;
    let raf: number | null = null;

    const stopMomentum = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      stopMomentum();
      const t = e.touches[0]!;
      startX = t.clientX;
      startY = t.clientY;
      startLeft = el.scrollLeft;
      lastY = t.clientY;
      lastT = e.timeStamp;
      velocity = 0;
      axis = null;
    };

    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0]!;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (axis === null) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_SLOP) return;
        axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
      }
      if (axis !== 'y') return;
      e.preventDefault();
      el.scrollLeft = startLeft - dy;
      const dt = Math.max(1, e.timeStamp - lastT);
      /* Smoothed finger speed, in scroll direction (px/ms) */
      velocity = 0.8 * ((lastY - t.clientY) / dt) + 0.2 * velocity;
      lastY = t.clientY;
      lastT = e.timeStamp;
    };

    const onEnd = () => {
      if (axis !== 'y' || Math.abs(velocity) < MIN_SPEED) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      let v = velocity;
      let prev = performance.now();
      const step = (now: number) => {
        const dt = now - prev;
        prev = now;
        const before = el.scrollLeft;
        el.scrollLeft += v * dt;
        v *= Math.pow(FRICTION, dt / 16);
        /* Stop at either end or once slow */
        if (Math.abs(v) < MIN_SPEED || el.scrollLeft === before) {
          raf = null;
          return;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      stopMomentum();
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [ref]);
}
