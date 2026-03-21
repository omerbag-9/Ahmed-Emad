'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  onPhotoClick?: (index: number) => void;
}

export default function PhotoSlider({ photos, onPhotoClick }: PhotoSliderProps) {
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

  if (photos.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>No photos yet</p>
      </div>
    );
  }

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
            onClick={() => onPhotoClick?.(i)}
          >
            <div className={styles.slideInner} onContextMenu={(e) => e.preventDefault()}>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
