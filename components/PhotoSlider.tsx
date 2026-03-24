'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import PhotoShareButton from '@/components/PhotoShareButton';
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

/**
 * Strip cells use full gallery height; column width ≈ height × (w/h). A flat `vw`-based
 * sizes hint understates landscape columns (often wider than the viewport), so Next/Image
 * serves a file too small and it looks soft/pixelated. This uses a stable px upper bound
 * from intrinsic aspect ratio only (no window), so SSR and client match.
 */
function sizesForStripPhoto(naturalW: number, naturalH: number): string {
  const ar = naturalW / Math.max(naturalH, 1);
  const estCssWidth = Math.min(3840, Math.ceil(1150 * ar));
  return `${estCssWidth}px`;
}

/**
 * Which photo is "current" for prev/next: viewport center in strip coordinates
 * (`scrollLeft + clientWidth/2`). Prefer the item that contains that X; in gaps, nearest midline.
 */
function indexFromScrollPosition(strip: HTMLDivElement, items: HTMLElement[]): number {
  if (items.length === 0) return 0;
  const center = strip.scrollLeft + strip.clientWidth / 2;
  for (let i = 0; i < items.length; i += 1) {
    const el = items[i]!;
    const left = el.offsetLeft;
    const right = left + el.offsetWidth;
    if (center >= left && center <= right) return i;
  }
  let best = 0;
  let bestDist = Infinity;
  items.forEach((el, i) => {
    const mid = el.offsetLeft + el.offsetWidth / 2;
    const d = Math.abs(mid - center);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
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

export default function PhotoSlider({
  photos,
  onSwitchToGrid,
  initialFocusPhotoId = null,
}: PhotoSliderProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const itemById = useRef(new Map<string, HTMLDivElement>());
  const [fullscreen, setFullscreen] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const orderedStripItems = useCallback((): HTMLElement[] => {
    return photos.map((p) => itemById.current.get(p.id)).filter((el): el is HTMLDivElement => el != null);
  }, [photos]);

  const updateScrollEdges = useCallback(() => {
    const strip = stripRef.current;
    if (!strip || photos.length < 2) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const items = orderedStripItems();
    if (items.length === 0) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const idx = indexFromScrollPosition(strip, items);
    setCanPrev(idx > 0);
    setCanNext(idx < items.length - 1);
  }, [photos, orderedStripItems]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    const applyScroll = (): boolean => {
      if (initialFocusPhotoId) {
        const item = itemById.current.get(initialFocusPhotoId);
        if (item) {
          scrollItemCenterIntoStripInstant(el, item);
          updateScrollEdges();
          return true;
        }
        return false;
      }
      el.scrollLeft = 0;
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
  }, [photos, initialFocusPhotoId, updateScrollEdges]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => updateScrollEdges());
    el.addEventListener('scroll', updateScrollEdges, { passive: true });
    const ro = new ResizeObserver(updateScrollEdges);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', updateScrollEdges);
      ro.disconnect();
    };
  }, [photos, updateScrollEdges]);

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
    const idx = indexFromScrollPosition(strip, items);
    const prevIdx = Math.max(0, idx - 1);
    scrollItemCenterIntoStrip(strip, items[prevIdx]!);
  }, [photos, orderedStripItems]);

  const goNext = useCallback(() => {
    const strip = stripRef.current;
    if (!strip || photos.length < 2) return;
    const items = orderedStripItems();
    if (items.length === 0) return;
    const idx = indexFromScrollPosition(strip, items);
    const nextIdx = Math.min(items.length - 1, idx + 1);
    scrollItemCenterIntoStrip(strip, items[nextIdx]!);
  }, [photos, orderedStripItems]);

  const onFullscreenClick = () => toggleFullscreen(wrapRef.current);

  if (photos.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>No photos yet</p>
      </div>
    );
  }

  const showNav = photos.length > 1;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div
        ref={stripRef}
        className={styles.strip}
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
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes={sizesForStripPhoto(w, h)}
                  className={styles.image}
                  style={{ objectFit: 'cover' }}
                  quality={92}
                  priority={i === 0}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />
                <div className={styles.shareWrap}>
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
          className={styles.toolBtn}
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
