'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
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

interface PhotoSliderProps {
  photos: Photo[];
}

export default function PhotoSlider({ photos }: PhotoSliderProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const updateIndexFromScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el || photos.length === 0) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    setIndex(Math.min(Math.max(0, i), photos.length - 1));
  }, [photos.length]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    updateIndexFromScroll();
    el.addEventListener('scroll', updateIndexFromScroll, { passive: true });
    return () => el.removeEventListener('scroll', updateIndexFromScroll);
  }, [updateIndexFromScroll, photos]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    setIndex(0);
  }, [photos]);

  const goPrev = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    el.scrollBy({ left: -w, behavior: 'smooth' });
  }, []);

  const goNext = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    el.scrollBy({ left: w, behavior: 'smooth' });
  }, []);

  if (photos.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>No photos yet</p>
      </div>
    );
  }

  const showNav = photos.length > 1;

  return (
    <div className={styles.wrap}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Photos, ${index + 1} of ${photos.length}. Swipe horizontally.`}
      >
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className={styles.slide}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${photos.length}`}
          >
            <div
              className={`${styles.slideInner} noImageSave`}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div
                className={styles.photoFrame}
                style={
                  {
                    ['--ar' as string]: String(Math.max(photo.width, 1) / Math.max(photo.height, 1)),
                  } as CSSProperties
                }
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="100vw"
                  className={styles.image}
                  style={{ objectFit: 'contain' }}
                  quality={88}
                  priority={i === 0}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />
                <PhotoShareButton photoId={photo.id} variant="slider" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNav ? (
        <>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navPrev}`}
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            disabled={index === 0}
            aria-label="Previous photo"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navNext}`}
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            disabled={index >= photos.length - 1}
            aria-label="Next photo"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      ) : null}
    </div>
  );
}
