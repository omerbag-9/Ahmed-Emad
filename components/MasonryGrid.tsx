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

/**
 * `sizes` must match on-screen width so Next picks a sharp src (incl. DPR). The old `360 * ar`
 * hint was far below real cell width (landscape spans 2 tracks ≈ 2× portrait column).
 */
function sizesForGridImage(landscape: boolean): string {
  return landscape
    ? '(min-width: 1400px) 1100px, (min-width: 901px) 80vw, 92vw'
    : '(min-width: 1400px) 560px, (min-width: 901px) 42vw, 50vw';
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
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes={sizesForGridImage(landscape)}
              loading={heavyGrid ? (index < 24 ? 'eager' : 'lazy') : index < 12 ? 'eager' : 'lazy'}
              quality={92}
              unoptimized={shouldUnoptimizeNextImage(photo.src)}
              onLoad={() => handleImageLoad(photo.id)}
              className={styles.imageFill}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
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
