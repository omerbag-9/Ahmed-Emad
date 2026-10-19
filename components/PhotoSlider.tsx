'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GalleryPhoto from '@/components/GalleryPhoto';
import Icon from '@/components/Icon';
import RollingNumber from '@/components/motion/RollingNumber';
import PhotoShareButton from '@/components/PhotoShareButton';
import { coverSizesVh } from '@/lib/cloudinaryImage';
import { STRIP_INITIAL_EAGER_RADIUS, STRIP_MAX_HEIGHT_VH } from '@/lib/galleryConstants';
import { useHorizontalPointerDragScroll } from '@/lib/useHorizontalPointerDragScroll';
import { type Observe, useScrollerPrefetch, useTileNear } from '@/lib/useScrollerPrefetch';
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

const StripTile = memo(function StripTile({
  photo,
  initiallyNear,
  highPriority,
  observe,
  registerItem,
}: {
  photo: Photo;
  initiallyNear: boolean;
  highPriority: boolean;
  observe: Observe;
  registerItem: (id: string, el: HTMLDivElement | null) => void;
}) {
  const [nearRef, near] = useTileNear<HTMLDivElement>(observe, initiallyNear);
  const w = Math.max(photo.width, 1);
  const h = Math.max(photo.height, 1);
  return (
    <div
      ref={(el) => {
        nearRef.current = el;
        registerItem(photo.id, el);
      }}
      className={`${styles.stripItem} noImageSave`}
      data-photo-id={photo.id}
      style={{ aspectRatio: `${w} / ${h}` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={styles.cellFill}>
        <GalleryPhoto
          src={photo.src}
          alt={photo.alt}
          width={w}
          height={h}
          sizes={coverSizesVh(w, h, STRIP_MAX_HEIGHT_VH)}
          eager={near}
          highPriority={highPriority}
        />
        <div className={styles.shareWrap} data-ae-no-pan-scroll>
          <PhotoShareButton photoId={photo.id} />
        </div>
      </div>
    </div>
  );
});

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
  /** Index of the photo at the strip's centre, for the counter */
  const [current, setCurrent] = useState(() =>
    Math.max(0, initialFocusPhotoId ? photos.findIndex((p) => p.id === initialFocusPhotoId) : 0)
  );
  const currentRef = useRef(current);
  const observe = useScrollerPrefetch(stripRef);

  const registerItem = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) itemById.current.set(id, el);
    else itemById.current.delete(id);
  }, []);

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
    let idx = indexFromScrollCached(cx, stripLayoutRef.current);
    /* The first and last photos cannot reach the centre: count the scroll ends as them */
    if (strip.scrollLeft <= 2) idx = 0;
    else if (strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2) idx = items.length - 1;
    if (currentRef.current !== idx) {
      currentRef.current = idx;
      setCurrent(idx);
    }
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
    const prevIdx = Math.max(0, currentRef.current - 1);
    scrollItemCenterIntoStrip(strip, items[prevIdx]!);
  }, [photos, orderedStripItems, rebuildStripLayout]);

  const goNext = useCallback(() => {
    const strip = stripRef.current;
    if (!strip || photos.length < 2) return;
    const items = orderedStripItems();
    if (items.length === 0) return;
    rebuildStripLayout();
    const nextIdx = Math.min(items.length - 1, currentRef.current + 1);
    scrollItemCenterIntoStrip(strip, items[nextIdx]!);
  }, [photos, orderedStripItems, rebuildStripLayout]);

  useHorizontalPointerDragScroll(stripRef);

  /* Arrows step through photos, Esc returns to the grid, F toggles fullscreen */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape' && !document.fullscreenElement) {
        onSwitchToGrid?.();
      } else if (e.key === 'f' || e.key === 'F') {
        void toggleFullscreen(wrapRef.current);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onSwitchToGrid]);

  const onFullscreenClick = () => toggleFullscreen(wrapRef.current);

  if (photos.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>No photos yet</p>
      </div>
    );
  }

  const showNav = photos.length > 1;
  const focusIndex = Math.max(
    0,
    initialFocusPhotoId ? photos.findIndex((p) => p.id === initialFocusPhotoId) : 0
  );

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div
        ref={stripRef}
        className={styles.strip}
        role="region"
        aria-label={`Photo gallery, ${photos.length} images. Scroll horizontally.`}
      >
        {photos.map((photo, i) => (
          <StripTile
            key={photo.id}
            photo={photo}
            initiallyNear={Math.abs(i - focusIndex) <= STRIP_INITIAL_EAGER_RADIUS}
            highPriority={Math.abs(i - focusIndex) <= 1}
            observe={observe}
            registerItem={registerItem}
          />
        ))}
      </div>

      <footer className={styles.footerBar} aria-label="Gallery controls">
        <div className={styles.toolGroup}>
          {onSwitchToGrid ? (
            <button type="button" className={styles.toolBtn} onClick={onSwitchToGrid} aria-label="Grid view" title="Grid view (Esc)">
              <Icon name="grid" />
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.fullscreenTool}`}
            onClick={onFullscreenClick}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
          >
            <Icon name={fullscreen ? 'collapse' : 'expand'} />
          </button>
        </div>
        {showNav ? (
          <div className={styles.toolGroup}>
            <span className={styles.counter} aria-live="polite">
              <b>
                <RollingNumber value={current + 1} />
              </b>{' '}
              of {photos.length}
            </span>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              disabled={!canPrev}
              aria-label="Previous photo"
              title="Previous (←)"
            >
              <Icon name="chevron-left" />
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
              title="Next (→)"
            >
              <Icon name="chevron-right" />
            </button>
          </div>
        ) : null}
      </footer>
    </div>
  );
}
