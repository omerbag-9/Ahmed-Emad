'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PhotoShareButton from '@/components/PhotoShareButton';
import {
  HEAVY_STRIP_THRESHOLD,
  STRIP_EAGER_LOADING_MAX,
  stripSlideSizes,
} from '@/lib/galleryConstants';
import { shouldUnoptimizeNextImage } from '@/lib/shouldUnoptimizeNextImage';
import { useHorizontalPointerDragScroll } from '@/lib/useHorizontalPointerDragScroll';
import { useNarrowGalleryViewport } from '@/lib/useNarrowGalleryViewport';
import styles from './PhotoSlider.module.css';

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  width: number;
  height: number;
}

export interface PhotoSliderProps {
  photos: Photo[];
  /** Toolbar: return to masonry/grid view */
  onSwitchToGrid?: () => void;
  /** After opening from grid, center this photo in the strip */
  initialFocusPhotoId?: string | null;
}

function IconGrid() {
  const u = 4.5;
  const g = 2;
  const o = 3.25;
  const cells = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={o + col * (u + g)}
          y={o + row * (u + g)}
          width={u}
          height={u}
          rx={0.35}
          fill="currentColor"
        />
      );
    }
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      {cells}
    </svg>
  );
}

function IconExpand() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7M3 9V3h6M21 15v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCollapse() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 14v6h6M20 10V4h-6M14 4l-5 5M10 20l5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Scroll the strip so `item` is centered (smooth for arrow controls). */
function scrollItemCenterIntoStrip(strip: HTMLDivElement, item: HTMLElement) {
  const sr = strip.getBoundingClientRect();
  const ir = item.getBoundingClientRect();
  const itemCenterX = ir.left + ir.width / 2;
  const viewCenterX = sr.left + sr.width / 2;
  const delta = itemCenterX - viewCenterX;
  strip.scrollBy({ left: delta, behavior: 'smooth' });
}

/** Jump with no animation (e.g. opening from grid). */
function scrollItemCenterIntoStripInstant(strip: HTMLDivElement, item: HTMLElement) {
  const sr = strip.getBoundingClientRect();
  const ir = item.getBoundingClientRect();
  const delta = ir.left + ir.width / 2 - (sr.left + sr.width / 2);
  const maxScroll = Math.max(0, strip.scrollWidth - strip.clientWidth);
  strip.scrollLeft = Math.max(0, Math.min(strip.scrollLeft + delta, maxScroll));
}

async function toggleFullscreen(el: HTMLElement | null): Promise<void> {
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

/** Stable order identity so parent re-renders with a new array reference do not reset scroll. */
function photosOrderKey(list: { id: string }[]): string {
  let s = '';
  for (let i = 0; i < list.length; i += 1) {
    if (i > 0) s += '\0';
    s += list[i]!.id;
  }
  return s;
}

type StripSegment = { L: number; R: number };

function indexFromScrollCached(cx: number, segs: StripSegment[]): number {
  if (segs.length === 0) return 0;
  for (let i = 0; i < segs.length; i += 1) {
    const s = segs[i]!;
    if (cx >= s.L && cx <= s.R) return i;
  }
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < segs.length; i += 1) {
    const s = segs[i]!;
    const mid = (s.L + s.R) / 2;
    const d = Math.abs(cx - mid);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export default function PhotoSlider({
  photos,
  onSwitchToGrid,
  initialFocusPhotoId = null,
}: PhotoSliderProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const itemById = useRef(new Map<string, HTMLDivElement>());
  const edgesRef = useRef({ canPrev: false, canNext: false });
  const scrollEdgesRafRef = useRef<number | null>(null);
  /** Snapshot of each strip cell’s horizontal span in strip coordinates — avoids O(n) layout reads every scroll. */
  const stripLayoutRef = useRef<StripSegment[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const isNarrowStrip = useNarrowGalleryViewport();

  const orderKey = useMemo(() => photosOrderKey(photos), [photos]);

  const orderedStripItems = useCallback((): HTMLElement[] => {
    return photos.map((p) => itemById.current.get(p.id)).filter((el): el is HTMLDivElement => el != null);
  }, [photos]);

  const rebuildStripLayout = useCallback(() => {
    const items = orderedStripItems();
    if (items.length === 0) {
      stripLayoutRef.current = [];
      return;
    }
    stripLayoutRef.current = items.map((el) => {
      const L = el.offsetLeft;
      return { L, R: L + el.offsetWidth };
    });
  }, [orderedStripItems]);

  const updateScrollEdges = useCallback(() => {
    const strip = stripRef.current;
    if (!strip || photos.length < 2) {
      if (edgesRef.current.canPrev || edgesRef.current.canNext) {
        edgesRef.current = { canPrev: false, canNext: false };
        setCanPrev(false);
        setCanNext(false);
      }
      return;
    }
    const items = orderedStripItems();
    if (items.length === 0) {
      if (edgesRef.current.canPrev || edgesRef.current.canNext) {
        edgesRef.current = { canPrev: false, canNext: false };
        setCanPrev(false);
        setCanNext(false);
      }
      return;
    }
    /* Avoid rebuilding with a partial ref map during the first paint pass */
    if (items.length !== photos.length) {
      return;
    }
    if (stripLayoutRef.current.length !== items.length) {
      rebuildStripLayout();
    }
    const cx = strip.scrollLeft + strip.clientWidth / 2;
    const idx = indexFromScrollCached(cx, stripLayoutRef.current);
    const nextPrev = idx > 0;
    const nextNext = idx < items.length - 1;
    if (edgesRef.current.canPrev !== nextPrev || edgesRef.current.canNext !== nextNext) {
      edgesRef.current = { canPrev: nextPrev, canNext: nextNext };
      setCanPrev(nextPrev);
      setCanNext(nextNext);
    }
  }, [photos, orderedStripItems, rebuildStripLayout]);

  const scheduleScrollEdgesUpdate = useCallback(() => {
    if (scrollEdgesRafRef.current != null) return;
    scrollEdgesRafRef.current = requestAnimationFrame(() => {
      scrollEdgesRafRef.current = null;
      updateScrollEdges();
    });
  }, [updateScrollEdges]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    const applyScroll = (): boolean => {
      if (initialFocusPhotoId) {
        const item = itemById.current.get(initialFocusPhotoId);
        if (item) {
          scrollItemCenterIntoStripInstant(el, item);
          rebuildStripLayout();
          updateScrollEdges();
          return true;
        }
        return false;
      }
      el.scrollLeft = 0;
      rebuildStripLayout();
      updateScrollEdges();
      return true;
    };

    const ok = applyScroll();
    if (!ok && initialFocusPhotoId) {
      const id = requestAnimationFrame(() => {
        applyScroll();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [orderKey, initialFocusPhotoId, rebuildStripLayout, updateScrollEdges]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      rebuildStripLayout();
      updateScrollEdges();
    });
    const onResize = () => {
      rebuildStripLayout();
      scheduleScrollEdgesUpdate();
    };
    el.addEventListener('scroll', scheduleScrollEdgesUpdate, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      if (scrollEdgesRafRef.current != null) {
        cancelAnimationFrame(scrollEdgesRafRef.current);
        scrollEdgesRafRef.current = null;
      }
      el.removeEventListener('scroll', scheduleScrollEdgesUpdate);
      ro.disconnect();
    };
  }, [orderKey, rebuildStripLayout, updateScrollEdges, scheduleScrollEdgesUpdate]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const goPrev = useCallback(() => {
    const strip = stripRef.current;
    if (!strip || photos.length < 2) return;
    const items = orderedStripItems();
    if (items.length === 0) return;
    rebuildStripLayout();
    const cx = strip.scrollLeft + strip.clientWidth / 2;
    const idx = indexFromScrollCached(cx, stripLayoutRef.current);
    const prevIdx = Math.max(0, idx - 1);
    scrollItemCenterIntoStrip(strip, items[prevIdx]!);
  }, [photos, orderedStripItems, rebuildStripLayout]);

  const goNext = useCallback(() => {
    const strip = stripRef.current;
    if (!strip || photos.length < 2) return;
    const items = orderedStripItems();
    if (items.length === 0) return;
    rebuildStripLayout();
    const cx = strip.scrollLeft + strip.clientWidth / 2;
    const idx = indexFromScrollCached(cx, stripLayoutRef.current);
    const nextIdx = Math.min(items.length - 1, idx + 1);
    scrollItemCenterIntoStrip(strip, items[nextIdx]!);
  }, [photos, orderedStripItems, rebuildStripLayout]);

  useHorizontalPointerDragScroll(stripRef);

  const onFullscreenClick = () => toggleFullscreen(wrapRef.current);

  if (photos.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>No photos yet</p>
      </div>
    );
  }

  const showNav = photos.length > 1;
  const heavyStrip = photos.length > HEAVY_STRIP_THRESHOLD;
  /** Mobile: eager-load every slide so decoded bitmaps stay after horizontal swipe; desktop: cap eager set when huge. */
  const eagerStripLoading = isNarrowStrip || photos.length <= STRIP_EAGER_LOADING_MAX;
  const edgePriorityCount = eagerStripLoading ? 6 : 14;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div
        ref={stripRef}
        className={`${styles.strip} ${heavyStrip ? styles.stripHeavy : ''}`}
        role="region"
        aria-label={`Photo gallery, ${photos.length} images. Scroll horizontally.`}
      >
        {photos.map((photo, i) => {
          const w = Math.max(photo.width, 1);
          const h = Math.max(photo.height, 1);
          return (
            <div
              key={photo.id}
              ref={(el) => {
                if (el) itemById.current.set(photo.id, el);
                else itemById.current.delete(photo.id);
              }}
              className={`${styles.stripItem} noImageSave`}
              style={{ aspectRatio: `${w} / ${h}` }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className={styles.cellFill}>
                {heavyStrip ? (
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    width={w}
                    height={h}
                    className={styles.imageNative}
                    loading={
                      eagerStripLoading
                        ? 'eager'
                        : i < 8 || i >= photos.length - 8
                          ? 'eager'
                          : 'lazy'
                    }
                    decoding="async"
                    fetchPriority={
                      eagerStripLoading
                        ? i < 6
                          ? 'high'
                          : 'auto'
                        : i === 0
                          ? 'high'
                          : i > photos.length - 4
                            ? 'low'
                            : 'auto'
                    }
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                ) : (
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes={stripSlideSizes(w, h)}
                    className={styles.image}
                    style={{ objectFit: 'cover' }}
                    quality={92}
                    unoptimized={shouldUnoptimizeNextImage(photo.src)}
                    loading={eagerStripLoading ? 'eager' : 'lazy'}
                    priority={
                      i === 0 ||
                      (eagerStripLoading && i < 10) ||
                      (!eagerStripLoading &&
                        (i < edgePriorityCount || i >= photos.length - edgePriorityCount))
                    }
                    placeholder={eagerStripLoading ? 'empty' : undefined}
                    decoding="async"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                )}
                <div className={styles.shareWrap} data-ae-no-pan-scroll>
                  <PhotoShareButton photoId={photo.id} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <footer className={styles.footerBar} aria-label="Gallery controls">
        {onSwitchToGrid ? (
          <button type="button" className={styles.toolBtn} onClick={onSwitchToGrid} aria-label="Grid view">
            <IconGrid />
          </button>
        ) : null}
        <button
          type="button"
          className={`${styles.toolBtn} ${styles.fullscreenTool}`}
          onClick={onFullscreenClick}
          aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {fullscreen ? <IconCollapse /> : <IconExpand />}
        </button>
        {showNav ? (
          <>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              disabled={!canPrev}
              aria-label="Previous photo"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              disabled={!canNext}
              aria-label="Next photo"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        ) : null}
      </footer>
    </div>
  );
}
