'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import GalleryPhoto from '@/components/GalleryPhoto';
import Icon from '@/components/Icon';
import PhotoShareButton from '@/components/PhotoShareButton';
import RollingNumber from '@/components/motion/RollingNumber';
import TiltedCard from '@/components/motion/TiltedCard';
import { cloudinaryPlaceholder, coverSizesVh } from '@/lib/cloudinaryImage';
import { STRIP_INITIAL_EAGER_RADIUS } from '@/lib/galleryConstants';
import { useHorizontalPointerDragScroll } from '@/lib/useHorizontalPointerDragScroll';
import { useVerticalSwipeScroll } from '@/lib/useVerticalSwipeScroll';
import { type SlideshowProps, toggleFullscreen, useFullscreenFlag } from './useSlideshow';
import styles from './SpotlightStrip.module.css';

/** Tile height as a share of the stage, leaving room for the floor reflection and the caption */
const TILE_HEIGHT_VH = 70;
/** Distance (in half-screens) past which a tile stops sinking further back */
const MAX_DEPTH = 1.6;

/**
 * Concept B — "Walkthrough". The free-scrolling strip stays, but moving through it is like walking
 * an exhibition corridor: the print in front of you faces you, lit, and leans toward the pointer
 * (ReactBits TiltedCard); the ones along the wall turn away and fall into shadow, the room takes
 * the colours of the print you stand at, and the strip settles on the nearest print when you let go.
 */
export default function SpotlightStrip({ photos, onSwitchToGrid, initialFocusPhotoId = null }: SlideshowProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const tiles = useRef<(HTMLDivElement | null)[]>([]);
  const fullscreen = useFullscreenFlag();
  const focusIndex = Math.max(0, initialFocusPhotoId ? photos.findIndex((p) => p.id === initialFocusPhotoId) : 0);
  const [current, setCurrent] = useState(focusIndex);
  /** Tiles that have been close enough to the middle to load (never flips back) */
  const [loadedUpTo, setLoadedUpTo] = useState({
    lo: focusIndex - STRIP_INITIAL_EAGER_RADIUS,
    hi: focusIndex + STRIP_INITIAL_EAGER_RADIUS,
  });
  const currentRef = useRef(current);
  const count = photos.length;

  const centerOn = useCallback((i: number, smooth: boolean) => {
    const strip = stripRef.current;
    const tile = tiles.current[i];
    if (!strip || !tile) return;
    const left = tile.offsetLeft + tile.offsetWidth / 2 - strip.clientWidth / 2;
    strip.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  /* Every frame the strip moves: each tile's signed distance from the middle drives its depth (CSS) */
  const paint = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    const half = strip.clientWidth / 2 || 1;
    let best = 0;
    let bestD = Infinity;
    tiles.current.forEach((tile, i) => {
      if (!tile) return;
      const c = tile.offsetLeft + tile.offsetWidth / 2;
      const raw = (c - mid) / half;
      const d = Math.max(-MAX_DEPTH, Math.min(MAX_DEPTH, raw));
      tile.style.setProperty('--d', d.toFixed(4));
      tile.style.setProperty('--ad', Math.abs(d).toFixed(4));
      if (Math.abs(raw) < bestD) {
        bestD = Math.abs(raw);
        best = i;
      }
    });
    if (best !== currentRef.current) {
      currentRef.current = best;
      setCurrent(best);
      setLoadedUpTo((r) =>
        best - 2 < r.lo || best + 2 > r.hi ? { lo: Math.min(r.lo, best - 2), hi: Math.max(r.hi, best + 2) } : r
      );
    }
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    centerOn(currentRef.current, false);
    let raf: number | null = requestAnimationFrame(() => {
      raf = null;
      paint();
    });
    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(() => {
        raf = null;
        paint();
      });
    };
    /* Let go between two photos and the strip glides to the nearer one */
    const onScrollEnd = () => {
      if (strip.classList.contains('ae-pan-scrolling')) return;
      const tile = tiles.current[currentRef.current];
      if (!tile) return;
      const off = tile.offsetLeft + tile.offsetWidth / 2 - (strip.scrollLeft + strip.clientWidth / 2);
      if (Math.abs(off) > 2) centerOn(currentRef.current, true);
    };
    const ro = new ResizeObserver(() => {
      centerOn(currentRef.current, false);
      paint();
    });
    ro.observe(strip);
    strip.addEventListener('scroll', onScroll, { passive: true });
    strip.addEventListener('scrollend', onScrollEnd);
    /* The drag hook ends without a scrollend when the pointer barely moved the strip */
    strip.addEventListener('pointerup', onScrollEnd);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      ro.disconnect();
      strip.removeEventListener('scroll', onScroll);
      strip.removeEventListener('scrollend', onScrollEnd);
      strip.removeEventListener('pointerup', onScrollEnd);
    };
  }, [centerOn, paint, count]);

  const step = useCallback(
    (by: number) => centerOn(Math.max(0, Math.min(count - 1, currentRef.current + by)), true),
    [centerOn, count]
  );

  useHorizontalPointerDragScroll(stripRef);
  useVerticalSwipeScroll(stripRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'Escape' && !document.fullscreenElement) {
        onSwitchToGrid?.();
      } else if (e.key === 'f' || e.key === 'F') {
        void toggleFullscreen(wrapRef.current);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [step, onSwitchToGrid]);

  if (count === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>No photos yet</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.room}>
        {photos.map((p, i) =>
          Math.abs(i - current) <= 1 ? (
            <div
              key={`glow-${p.id}`}
              className={styles.glow}
              data-active={i === current || undefined}
              style={{ backgroundImage: `url("${cloudinaryPlaceholder(p.src) ?? p.thumbnail}")` }}
              aria-hidden
            />
          ) : null
        )}

        <div
          ref={stripRef}
          className={styles.strip}
          role="region"
          aria-label={`Photo gallery, ${count} images. Scroll horizontally.`}
        >
          {photos.map((p, i) => {
            const w = Math.max(p.width, 1);
            const h = Math.max(p.height, 1);
            return (
              <div
                key={p.id}
                ref={(el) => {
                  tiles.current[i] = el;
                }}
                className={`${styles.tile} noImageSave`}
                data-photo-id={p.id}
                data-active={i === current || undefined}
                style={{ aspectRatio: `${w} / ${h}` }}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => {
                  if (i !== currentRef.current) centerOn(i, true);
                }}
              >
                <TiltedCard className={styles.print} disabled={i !== current}>
                  <GalleryPhoto
                    src={p.src}
                    alt={p.alt}
                    width={w}
                    height={h}
                    sizes={coverSizesVh(w, h, TILE_HEIGHT_VH)}
                    eager={i >= loadedUpTo.lo && i <= loadedUpTo.hi}
                    highPriority={Math.abs(i - focusIndex) <= 1}
                  />
                  <div className={styles.shade} aria-hidden />
                  {i === current ? (
                    <div className={styles.shareWrap} data-ae-no-pan-scroll>
                      <PhotoShareButton photoId={p.id} />
                    </div>
                  ) : null}
                </TiltedCard>
              </div>
            );
          })}
        </div>
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
            onClick={() => toggleFullscreen(wrapRef.current)}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
          >
            <Icon name={fullscreen ? 'collapse' : 'expand'} />
          </button>
        </div>
        {count > 1 ? (
          <>
            {/* One tick per photo; the lit one is where you are */}
            <div className={styles.ticks} aria-hidden>
              {photos.map((p, i) => (
                <span key={p.id} data-on={i === current || undefined} />
              ))}
            </div>
            <div className={styles.toolGroup}>
              <span className={styles.counter} aria-live="polite">
                <b>
                  <RollingNumber value={current + 1} />
                </b>{' '}
                of {count}
              </span>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => step(-1)}
                disabled={current === 0}
                aria-label="Previous photo"
                title="Previous (←)"
              >
                <Icon name="chevron-left" />
              </button>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => step(1)}
                disabled={current === count - 1}
                aria-label="Next photo"
                title="Next (→)"
              >
                <Icon name="chevron-right" />
              </button>
            </div>
          </>
        ) : null}
      </footer>
    </div>
  );
}
