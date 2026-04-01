'use client';

import type { RefObject } from 'react';
import { useEffect } from 'react';

const DEFAULT_EXCLUDE = '[data-ae-no-pan-scroll]';

type Options = {
  /** Match `ResponsiveGallery` / layout: only enable on wider viewports */
  desktopMinWidth?: number;
  /**
   * Pixels before horizontal pan counts as a drag. Use a small positive value when the same
   * surface has click targets (e.g. full-cell open button) so taps still work.
   */
  dragThreshold?: number;
  /**
   * After a drag, swallow the following click (capture) so overlay buttons do not fire.
   * Use together with a positive `dragThreshold`.
   */
  suppressNextClickAfterDrag?: boolean;
  /**
   * Document-tracking mode only (`dragThreshold` > 0). If the pointer moves farther than this
   * from `pointerdown` (Chebyshev: max of |Δx|, |Δy|), the gesture is treated as “not a tap”
   * and the next click is suppressed even when panning never started. Should be **smaller** than
   * `dragThreshold` so small wobbles do not open the photo while scrolling.
   */
  clickSlopPx?: number;
  /** Skip pan when `target.closest(excludeSelector)` */
  excludeSelector?: string;
  /**
   * When false (slider), ignore pointerdown on buttons/links so toolbar/share stay clickable.
   * When true (grid with full-cell button), allow pointerdown on those controls.
   */
  allowPointerDownOnInteractive?: boolean;
};

/**
 * Mouse/pen drag to scroll horizontally. Touch keeps native scrolling; trackpad is unchanged.
 */
export function useHorizontalPointerDragScroll(
  ref: RefObject<HTMLElement | null>,
  options: Options = {}
): void {
  const {
    desktopMinWidth = 901,
    dragThreshold = 0,
    suppressNextClickAfterDrag = false,
    clickSlopPx: clickSlopPxOpt,
    excludeSelector = DEFAULT_EXCLUDE,
    allowPointerDownOnInteractive = false,
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia(`(min-width: ${desktopMinWidth}px)`);
    let desktopOk = mq.matches;
    const onMq = () => {
      desktopOk = mq.matches;
    };
    mq.addEventListener('change', onMq);

    let startX = 0;
    let startY = 0;
    let scrollLeftStart = 0;
    let active = false;
    let activeId: number | null = null;
    let dragged = false;
    /** Largest max(|dx|,|dy|) seen during the current document-tracked gesture */
    let maxPointerSlop = 0;
    /** Coalesce scrollLeft writes to one per animation frame (reduces layout+scroll event storms while dragging). */
    let scrollRaf: number | null = null;
    let pendingScrollLeft: number | null = null;

    const flushPendingScrollLeft = () => {
      scrollRaf = null;
      if (pendingScrollLeft !== null) {
        el.scrollLeft = pendingScrollLeft;
        pendingScrollLeft = null;
      }
    };

    const cancelPendingScrollRaf = () => {
      if (scrollRaf !== null) {
        cancelAnimationFrame(scrollRaf);
        scrollRaf = null;
      }
    };

    const ignoreInteractive = (target: Element): boolean => {
      if (!allowPointerDownOnInteractive) {
        return !!target.closest('button, a, input, textarea, select, [role="button"]');
      }
      return false;
    };

    const shouldIgnoreDown = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return true;
      if (excludeSelector && target.closest(excludeSelector)) return true;
      return ignoreInteractive(target);
    };

    const scheduleConsumeNextClick = () => {
      window.setTimeout(() => {
        const eat = (e: MouseEvent) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          document.removeEventListener('click', eat, true);
        };
        document.addEventListener('click', eat, true);
      }, 0);
    };

    /**
     * If we call setPointerCapture on the scroll container while pointerdown target is a child
     * button, many browsers never fire a real click on that button. Grid mode uses a positive
     * `dragThreshold` and tracks the gesture on `document` without capture until panning starts,
     * so simple clicks still open the slider.
     */
    const useDocumentTracking = dragThreshold > 0;

    let docListenersAttached = false;

    const removeDocListeners = () => {
      if (!docListenersAttached) return;
      docListenersAttached = false;
      document.removeEventListener('pointermove', onDocPointerMove, true);
      document.removeEventListener('pointerup', onDocPointerUp, true);
      document.removeEventListener('pointercancel', onDocPointerUp, true);
    };

    const finishDocumentGesture = (suppressClick: boolean) => {
      removeDocListeners();
      cancelPendingScrollRaf();
      flushPendingScrollLeft();
      active = false;
      activeId = null;
      dragged = false;
      maxPointerSlop = 0;
      el.classList.remove('ae-pan-scrolling');
      if (suppressClick) scheduleConsumeNextClick();
    };

    const clickSlopPx =
      clickSlopPxOpt ?? (useDocumentTracking && suppressNextClickAfterDrag ? 5 : Number.POSITIVE_INFINITY);

    const recordSlop = (clientX: number, clientY: number) => {
      const dx = clientX - startX;
      const dy = clientY - startY;
      maxPointerSlop = Math.max(maxPointerSlop, Math.max(Math.abs(dx), Math.abs(dy)));
    };

    const onDocPointerMove = (e: PointerEvent) => {
      if (!active || e.pointerId !== activeId || !desktopOk) return;
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const dx = e.clientX - startX;
      recordSlop(e.clientX, e.clientY);
      if (!dragged && Math.abs(dx) < dragThreshold) return;
      if (!dragged) {
        dragged = true;
        el.classList.add('ae-pan-scrolling');
      }
      pendingScrollLeft = scrollLeftStart - dx;
      if (scrollRaf === null) {
        scrollRaf = requestAnimationFrame(flushPendingScrollLeft);
      }
      e.preventDefault();
    };

    const onDocPointerUp = (e: PointerEvent) => {
      if (!active || e.pointerId !== activeId) return;
      recordSlop(e.clientX, e.clientY);
      const didPan = dragged;
      const movedPastTapSlop = maxPointerSlop > clickSlopPx;
      const suppressClick =
        suppressNextClickAfterDrag && (didPan || (Number.isFinite(clickSlopPx) && movedPastTapSlop));
      finishDocumentGesture(suppressClick);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!desktopOk) return;
      if (e.button !== 0) return;
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      if (shouldIgnoreDown(e.target)) return;

      cancelPendingScrollRaf();
      pendingScrollLeft = null;

      active = true;
      dragged = false;
      activeId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      maxPointerSlop = 0;
      scrollLeftStart = el.scrollLeft;

      if (useDocumentTracking) {
        docListenersAttached = true;
        document.addEventListener('pointermove', onDocPointerMove, { capture: true, passive: false });
        document.addEventListener('pointerup', onDocPointerUp, { capture: true });
        document.addEventListener('pointercancel', onDocPointerUp, { capture: true });
        return;
      }

      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      el.classList.add('ae-pan-scrolling');
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!active || e.pointerId !== activeId || !desktopOk) return;
      const dx = e.clientX - startX;
      if (dragThreshold > 0) {
        if (!dragged && Math.abs(dx) < dragThreshold) return;
        if (!dragged) dragged = true;
      } else {
        dragged = Math.abs(dx) > 0;
      }
      pendingScrollLeft = scrollLeftStart - dx;
      if (scrollRaf === null) {
        scrollRaf = requestAnimationFrame(flushPendingScrollLeft);
      }
      if (dragged) e.preventDefault();
    };

    const end = (e: PointerEvent) => {
      if (!active || e.pointerId !== activeId) return;
      const id = activeId;
      const didDrag = dragged;
      cancelPendingScrollRaf();
      flushPendingScrollLeft();
      active = false;
      activeId = null;
      dragged = false;
      try {
        el.releasePointerCapture(id);
      } catch {
        /* ignore */
      }
      el.classList.remove('ae-pan-scrolling');
      if (didDrag && suppressNextClickAfterDrag) scheduleConsumeNextClick();
    };

    el.addEventListener('pointerdown', onPointerDown);
    if (!useDocumentTracking) {
      el.addEventListener('pointermove', onPointerMove, { passive: false });
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('lostpointercapture', end);
    }

    return () => {
      mq.removeEventListener('change', onMq);
      removeDocListeners();
      cancelPendingScrollRaf();
      pendingScrollLeft = null;
      el.classList.remove('ae-pan-scrolling');
      el.removeEventListener('pointerdown', onPointerDown);
      if (!useDocumentTracking) {
        el.removeEventListener('pointermove', onPointerMove);
        el.removeEventListener('pointerup', end);
        el.removeEventListener('pointercancel', end);
        el.removeEventListener('lostpointercapture', end);
      }
    };
  }, [
    ref,
    desktopMinWidth,
    dragThreshold,
    suppressNextClickAfterDrag,
    clickSlopPxOpt,
    excludeSelector,
    allowPointerDownOnInteractive,
  ]);
}
