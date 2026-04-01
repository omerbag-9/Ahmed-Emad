'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import PhotoShareButton from '@/components/PhotoShareButton';
import { shouldUnoptimizeNextImage } from '@/lib/shouldUnoptimizeNextImage';
import { useHorizontalPointerDragScroll } from '@/lib/useHorizontalPointerDragScroll';
import styles from './MasonryGrid.module.css';

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  width: number;
  height: number;
}

interface MasonryGridProps {
  photos: Photo[];
  /** Click a photo to open horizontal gallery on that image */
  onOpenPhotoInSlider?: (photoId: string) => void;
}

function isLandscape(photo: Photo): boolean {
  return photo.width > photo.height;
}

/** Stable `sizes` for fill cells (landscape columns are wide). */
function sizesForGridCell(naturalW: number, naturalH: number): string {
  const ar = naturalW / Math.max(naturalH, 1);
  return `${Math.min(3840, Math.ceil(360 * ar))}px`;
}

/** Smaller hint when grid shows a thumbnail URL (faster decode / less bandwidth). */
function sizesForGridThumbnail(): string {
  return '400px';
}

function gridImageSrc(photo: Photo): string {
  const t = photo.thumbnail?.trim();
  return t && t !== photo.src ? t : photo.src;
}

function isDistinctThumbnail(photo: Photo): boolean {
  const t = photo.thumbnail?.trim();
  return !!t && t !== photo.src;
}

/** Above this: native grid images + containment (Next/Image × N is costly while scrolling). */
const HEAVY_GRID_THRESHOLD = 28;

export default function MasonryGrid({ photos, onOpenPhotoInSlider }: MasonryGridProps) {
  const masonryRef = useRef<HTMLDivElement>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const heavyGrid = photos.length > HEAVY_GRID_THRESHOLD;

  useHorizontalPointerDragScroll(masonryRef, {
    /** Past this horizontal delta, pan scrolls (keep clearly above `clickSlopPx`) */
    dragThreshold: 12,
    /** Movement beyond this (any direction) cancels “open photo”; avoids opens while scrolling */
    clickSlopPx: 5,
    suppressNextClickAfterDrag: true,
    allowPointerDownOnInteractive: true,
  });

  const handleImageLoad = (id: string) => {
    if (heavyGrid) return;
    setLoadedImages((prev) => new Set(prev).add(id));
  };

  if (photos.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No photos yet</p>
      </div>
    );
  }

  return (
    <div ref={masonryRef} className={`${styles.masonry} ${heavyGrid ? styles.masonryHeavy : ''}`}>
      {photos.map((photo, index) => {
        const landscape = isLandscape(photo);
        const w = Math.max(photo.width, 1);
        const h = Math.max(photo.height, 1);
        const thumbGrid = isDistinctThumbnail(photo);
        const displaySrc = gridImageSrc(photo);
        const stagger = heavyGrid ? 0 : Math.min(index, 24) * 0.05;
        return (
        <div
          key={photo.id}
          className={`${styles.item} ${landscape ? styles.itemLandscape : ''} ${
            heavyGrid ? styles.itemInstant : ''
          } ${!heavyGrid && loadedImages.has(photo.id) ? styles.loaded : ''}`}
          style={heavyGrid ? undefined : { animationDelay: `${stagger}s` }}
        >
          <div
            className={`${styles.imageWrapper} noImageSave ${onOpenPhotoInSlider ? styles.imageWrapperClickable : ''}`}
            onContextMenu={(e) => e.preventDefault()}
          >
            {heavyGrid ? (
              // Native img: avoids per-cell Next/Image layout + IO cost on long portfolio strips
              <img
                src={displaySrc}
                alt={photo.alt}
                width={w}
                height={h}
                loading={index < 24 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={index < 8 ? 'high' : index > photos.length - 8 ? 'low' : 'auto'}
                className={styles.imageFillNative}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            ) : (
              <Image
                src={displaySrc}
                alt={photo.alt}
                fill
                sizes={thumbGrid ? sizesForGridThumbnail() : sizesForGridCell(w, h)}
                loading={index < 12 ? 'eager' : 'lazy'}
                quality={thumbGrid ? 80 : 85}
                unoptimized={shouldUnoptimizeNextImage(photo.src)}
                onLoad={() => handleImageLoad(photo.id)}
                className={styles.imageFill}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            )}
            {onOpenPhotoInSlider ? (
              <button
                type="button"
                className={styles.openInSliderHit}
                onClick={() => onOpenPhotoInSlider(photo.id)}
                aria-label={`Open ${photo.alt || 'photo'} in gallery view`}
              />
            ) : null}
            <div className={styles.shareWrap} data-ae-no-pan-scroll>
              <PhotoShareButton photoId={photo.id} />
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );
}
