'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import PhotoShareButton from '@/components/PhotoShareButton';
import { cloudinaryGridImageSrc } from '@/lib/cloudinaryGridSrc';
import {
  GRID_DESKTOP_EAGER_COUNT,
  GRID_IMAGE_QUALITY_LANDSCAPE,
  GRID_IMAGE_QUALITY_PORTRAIT,
  gridImageSizes,
} from '@/lib/galleryConstants';
import { shouldUnoptimizeNextImage } from '@/lib/shouldUnoptimizeNextImage';
import { useHorizontalPointerDragScroll } from '@/lib/useHorizontalPointerDragScroll';
import { useNarrowGalleryViewport } from '@/lib/useNarrowGalleryViewport';
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

export default function MasonryGrid({ photos, onOpenPhotoInSlider }: MasonryGridProps) {
  const masonryRef = useRef<HTMLDivElement>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const isNarrow = useNarrowGalleryViewport();

  useHorizontalPointerDragScroll(masonryRef, {
    dragThreshold: 12,
    clickSlopPx: 5,
    suppressNextClickAfterDrag: true,
    allowPointerDownOnInteractive: true,
  });

  const handleImageLoad = (id: string) => {
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
    <div ref={masonryRef} className={styles.masonry}>
      {photos.map((photo, index) => {
        const landscape = isLandscape(photo);
        const stagger = Math.min(index, 24) * 0.05;
        return (
          <div
            key={photo.id}
            className={`${styles.item} ${landscape ? styles.itemLandscape : ''} ${
              loadedImages.has(photo.id) ? styles.loaded : ''
            }`}
            style={{ animationDelay: `${stagger}s` }}
          >
            <div
              className={`${styles.imageWrapper} noImageSave ${onOpenPhotoInSlider ? styles.imageWrapperClickable : ''}`}
              onContextMenu={(e) => e.preventDefault()}
            >
              <Image
                src={cloudinaryGridImageSrc(photo.src, landscape)}
                alt={photo.alt}
                fill
                sizes={gridImageSizes(landscape)}
                loading={isNarrow ? 'eager' : index < GRID_DESKTOP_EAGER_COUNT ? 'eager' : 'lazy'}
                priority={isNarrow && index < 8}
                placeholder="empty"
                quality={landscape ? GRID_IMAGE_QUALITY_LANDSCAPE : GRID_IMAGE_QUALITY_PORTRAIT}
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
