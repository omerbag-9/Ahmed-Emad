'use client';

import { useEffect, useRef, useState } from 'react';
import GalleryPhoto from '@/components/GalleryPhoto';
import Icon from '@/components/Icon';
import PhotoShareButton from '@/components/PhotoShareButton';
import Magnet from '@/components/motion/Magnet';
import RollingNumber from '@/components/motion/RollingNumber';
import { coverSizesVh } from '@/lib/cloudinaryImage';
import {
  type SlidePhoto,
  type SlideshowProps,
  toggleFullscreen,
  useFullscreenFlag,
  useSlideshow,
  useSwipeStep,
  wrapIndex,
} from './useSlideshow';
import styles from './LouvreSlides.module.css';

/** Vertical slats the next photo opens through */
const SLATS = 7;

function Frame({
  photo,
  children,
  className,
  photoId,
}: {
  photo: SlidePhoto;
  children: React.ReactNode;
  className?: string;
  photoId?: string;
}) {
  const w = Math.max(photo.width, 1);
  const h = Math.max(photo.height, 1);
  return (
    <div className={`${styles.slide} ${className ?? ''} noImageSave`} onContextMenu={(e) => e.preventDefault()}>
      <div className={styles.frame} data-photo-id={photoId} style={{ ['--r' as string]: w / h }}>
        {children}
      </div>
    </div>
  );
}

function Photo({ photo, priority }: { photo: SlidePhoto; priority?: boolean }) {
  const w = Math.max(photo.width, 1);
  const h = Math.max(photo.height, 1);
  return (
    <GalleryPhoto
      src={photo.src}
      alt={photo.alt}
      width={w}
      height={h}
      sizes={coverSizesVh(w, h, 84)}
      eager
      highPriority={priority}
    />
  );
}

/**
 * Concept C — "Louvres". Each photograph opens through vertical slats, like light through a
 * brise-soleil: the slats turn open one after another in the direction you are going while the
 * building slides gently into place behind them. A contact sheet of the whole set runs underneath.
 */
export default function LouvreSlides({ photos, onSwitchToGrid, initialFocusPhotoId = null }: SlideshowProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreenFlag();
  const { index, dir, go, next, prev, count } = useSlideshow({ photos, initialFocusPhotoId, onSwitchToGrid, wrapRef });
  useSwipeStep(stageRef, next, prev);

  /* The photo being opened over, kept until the slats have finished (derived from the last render) */
  const [pair, setPair] = useState<{ cur: number; under: number | null; n: number }>({ cur: index, under: null, n: 0 });
  if (pair.cur !== index) setPair({ cur: index, under: pair.cur, n: pair.n + 1 });

  /* Keep the current frame of the contact sheet in view */
  useEffect(() => {
    const sheet = sheetRef.current;
    const thumb = sheet?.children[index] as HTMLElement | undefined;
    if (!sheet || !thumb) return;
    sheet.scrollTo({
      left: thumb.offsetLeft + thumb.offsetWidth / 2 - sheet.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [index]);

  if (count === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>No photos yet</p>
      </div>
    );
  }

  const cur = photos[index]!;
  const under = pair.under != null ? photos[pair.under] : undefined;
  const revealing = under != null;
  /* Slats open in the direction of travel */
  const order = (k: number) => (dir === 1 ? k : SLATS - 1 - k);
  const upcoming = photos[wrapIndex(index + 1, count)];

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div
        ref={stageRef}
        className={styles.stage}
        role="region"
        aria-roledescription="slideshow"
        aria-label={`Photo ${index + 1} of ${count}`}
      >
        {under ? (
          <Frame photo={under} className={styles.leaving} key={`under-${pair.n}`}>
            <Photo photo={under} />
          </Frame>
        ) : null}

        {revealing ? (
          <Frame photo={cur} key={`slats-${pair.n}`} className={styles.opening}>
            {Array.from({ length: SLATS }, (_, k) => (
              <div
                key={k}
                className={styles.slat}
                data-dir={dir}
                style={{
                  left: `${(k * 100) / SLATS}%`,
                  width: `${100 / SLATS + 0.2}%`,
                  animationDelay: `${order(k) * 70}ms`,
                }}
                onAnimationEnd={(e) => {
                  if (e.target === e.currentTarget && order(k) === SLATS - 1) setPair((p) => ({ ...p, under: null }));
                }}
              >
                <div
                  className={styles.slatInner}
                  data-dir={dir}
                  style={{ left: `${-k * 100}%`, width: `${SLATS * 100}%`, animationDelay: `${order(k) * 70}ms` }}
                >
                  <Photo photo={cur} priority />
                </div>
              </div>
            ))}
          </Frame>
        ) : (
          <Frame photo={cur} photoId={cur.id} key={`still-${cur.id}`}>
            <Photo photo={cur} priority />
            <div className={styles.shareWrap} data-ae-no-pan-scroll>
              <PhotoShareButton photoId={cur.id} />
            </div>
          </Frame>
        )}

        {/* The next photo loads out of sight so its slats open on a finished picture */}
        {upcoming && upcoming.id !== cur.id ? (
          <div className={styles.preload} aria-hidden>
            <Photo photo={upcoming} />
          </div>
        ) : null}
      </div>

      <footer className={styles.footerBar} aria-label="Slideshow controls">
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
            {/* Contact sheet: every frame of the set, the one on screen printed full strength */}
            <div ref={sheetRef} className={styles.sheet} data-ae-no-pan-scroll>
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.thumb}
                  data-on={i === index || undefined}
                  style={{ aspectRatio: `${Math.max(p.width, 1)} / ${Math.max(p.height, 1)}` }}
                  onClick={() => go(i)}
                  aria-label={`Photo ${i + 1}`}
                  aria-current={i === index || undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- 400px Cloudinary thumbnail */}
                  <img src={p.thumbnail} alt="" loading="lazy" draggable={false} />
                </button>
              ))}
            </div>
            <div className={styles.toolGroup}>
              <span className={styles.counter} aria-live="polite">
                <b>
                  <RollingNumber value={index + 1} />
                </b>{' '}
                of {count}
              </span>
              <Magnet strength={0.35}>
                <button type="button" className={styles.toolBtn} onClick={prev} aria-label="Previous photo" title="Previous (←)">
                  <Icon name="chevron-left" />
                </button>
              </Magnet>
              <Magnet strength={0.35}>
                <button type="button" className={styles.toolBtn} onClick={next} aria-label="Next photo" title="Next (→)">
                  <Icon name="chevron-right" />
                </button>
              </Magnet>
            </div>
          </>
        ) : null}
      </footer>
    </div>
  );
}
