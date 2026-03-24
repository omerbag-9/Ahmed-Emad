'use client';

import Image from 'next/image';
import { useState } from 'react';
import PhotoShareButton from '@/components/PhotoShareButton';
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

export default function MasonryGrid({ photos, onOpenPhotoInSlider }: MasonryGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

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
    <div className={styles.masonry}>
      {photos.map((photo, index) => {
        const landscape = isLandscape(photo);
        const w = Math.max(photo.width, 1);
        const h = Math.max(photo.height, 1);
        return (
        <div
          key={photo.id}
          className={`${styles.item} ${landscape ? styles.itemLandscape : ''} ${
            loadedImages.has(photo.id) ? styles.loaded : ''
          }`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div
            className={`${styles.imageWrapper} noImageSave ${onOpenPhotoInSlider ? styles.imageWrapperClickable : ''}`}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes={sizesForGridCell(w, h)}
              loading={index < 12 ? 'eager' : 'lazy'}
              quality={85}
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
            <div className={styles.shareWrap}>
              <PhotoShareButton photoId={photo.id} />
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );
}
