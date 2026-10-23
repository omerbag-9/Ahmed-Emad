'use client';

import { useRef, useState } from 'react';
import GalleryPhoto from '@/components/GalleryPhoto';
import Icon from '@/components/Icon';
import PhotoShareButton from '@/components/PhotoShareButton';
import BlurText from '@/components/motion/BlurText';
import Magnet from '@/components/motion/Magnet';
import RollingNumber from '@/components/motion/RollingNumber';
import { coverSizesVh } from '@/lib/cloudinaryImage';
import {
  type SlideshowProps,
  toggleFullscreen,
  useFullscreenFlag,
  useSlideshow,
  useSwipeStep,
  wrapIndex,
} from './useSlideshow';
import styles from './CinemaReel.module.css';

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How long each photo holds while the reel plays */
const HOLD_MS = 6500;

/**
 * Concept A — "Screening". The project plays like a short film: its name opens on black, letterbox
 * bars close in, and each photograph holds while the camera dollies slowly into the building, then
 * dissolves into the next. A timeline under the picture runs while the reel plays.
 */
export default function CinemaReel({
  photos,
  onSwitchToGrid,
  initialFocusPhotoId = null,
  title,
  location,
}: SlideshowProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreenFlag();
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  /* Opened from a grid tile, the photo morphs straight into place: no title card then */
  const [titleCard, setTitleCard] = useState(() => !initialFocusPhotoId && !prefersReducedMotion());
  const { index, next, prev, count } = useSlideshow({ photos, initialFocusPhotoId, onSwitchToGrid, wrapRef });
  useSwipeStep(stageRef, next, prev);

  if (count === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>No photos yet</p>
      </div>
    );
  }

  /* Only the photo on screen and its neighbours are mounted: the next one is already loaded when it fades in */
  const near = new Set([index, wrapIndex(index + 1, count), wrapIndex(index - 1, count)]);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div
        ref={stageRef}
        className={styles.stage}
        role="region"
        aria-roledescription="slideshow"
        aria-label={`Photo ${index + 1} of ${count}`}
      >
        {photos.map((p, i) => {
          if (!near.has(i)) return null;
          const w = Math.max(p.width, 1);
          const h = Math.max(p.height, 1);
          const active = i === index;
          return (
            <div
              key={p.id}
              className={`${styles.slide} noImageSave`}
              data-active={active || undefined}
              aria-hidden={!active}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div
                className={styles.frame}
                data-photo-id={active ? p.id : undefined}
                style={{ ['--r' as string]: w / h }}
              >
                {/* Four push directions in turn, so consecutive photos don't drift the same way */}
                <div className={styles.push} data-drift={i % 4}>
                  <GalleryPhoto
                    src={p.src}
                    alt={p.alt}
                    width={w}
                    height={h}
                    sizes={coverSizesVh(w, h, 86)}
                    eager
                    highPriority={active}
                  />
                </div>
                {active ? (
                  <div className={styles.shareWrap} data-ae-no-pan-scroll>
                    <PhotoShareButton photoId={p.id} />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        <div className={`${styles.bar} ${styles.barTop}`} aria-hidden />
        <div className={`${styles.bar} ${styles.barBottom}`} aria-hidden />

        {/* Opening title, as a film starts: the project's name on black, then the first photo */}
        {titleCard && title ? (
          <div className={styles.titleCard} aria-hidden onAnimationEnd={(e) => e.target === e.currentTarget && setTitleCard(false)}>
            <BlurText as="p" text={title} className={styles.titleName} delay={110} start={200} />
            {location?.trim() ? <p className={styles.titleWhere}>{location.trim()}</p> : null}
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
            <span className={styles.counter} aria-live="polite">
              <b>
                <RollingNumber value={index + 1} />
              </b>{' '}
              of {count}
            </span>
            <div className={styles.timeline} aria-hidden>
              {/* Re-keyed per photo (and on play) so the fill restarts; reaching the end cuts to the next photo */}
              <span
                key={`${index}-${playing}`}
                className={styles.timelineFill}
                data-playing={(playing && !titleCard) || undefined}
                style={{ animationDuration: `${HOLD_MS}ms` }}
                onAnimationEnd={(e) => e.target === e.currentTarget && next()}
              />
            </div>
            <div className={styles.toolGroup}>
              <Magnet strength={0.35}>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => setPlaying((v) => !v)}
                  aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
                  title={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <PauseGlyph /> : <PlayGlyph />}
                </button>
              </Magnet>
              <button type="button" className={styles.toolBtn} onClick={prev} aria-label="Previous photo" title="Previous (←)">
                <Icon name="chevron-left" />
              </button>
              <button type="button" className={styles.toolBtn} onClick={next} aria-label="Next photo" title="Next (→)">
                <Icon name="chevron-right" />
              </button>
            </div>
          </>
        ) : null}
      </footer>
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l10.5-6.5z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="7" y="5.5" width="3.2" height="13" />
      <rect x="13.8" y="5.5" width="3.2" height="13" />
    </svg>
  );
}
