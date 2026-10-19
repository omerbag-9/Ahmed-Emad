'use client';

import { memo, useRef, useState } from 'react';
import GalleryImage from '@/components/GalleryImage';
import PhotoShareButton from '@/components/PhotoShareButton';
import { coverSizesVh } from '@/lib/cloudinaryImage';
import {
  GRID_HIGH_PRIORITY_COUNT,
  GRID_INITIAL_EAGER_COUNT,
  GRID_PORTRAIT_CELL_MAX_WIDTH_VH,
  GRID_LANDSCAPE_CELL_MAX_WIDTH_VH,
  GRID_ROW_MAX_HEIGHT_VH,
} from '@/lib/galleryConstants';
import { useHorizontalPointerDragScroll } from '@/lib/useHorizontalPointerDragScroll';
import { type Observe, useScrollerPrefetch, useTileNear } from '@/lib/useScrollerPrefetch';
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

const GridTile = memo(function GridTile({
  photo,
  index,
  observe,
  onOpenPhotoInSlider,
}: {
  photo: Photo;
  index: number;
  observe: Observe;
  onOpenPhotoInSlider?: (photoId: string) => void;
}) {
  const landscape = isLandscape(photo);
  const [ref, near] = useTileNear<HTMLDivElement>(observe, index < GRID_INITIAL_EAGER_COUNT);
  /* Per-tile so one image finishing does not re-render the whole grid */
  const [loaded, setLoaded] = useState(false);
  const stagger = Math.min(index, 24) * 0.05;

  return (
    <div
      ref={ref}
      className={`${styles.item} ${landscape ? styles.itemLandscape : ''} ${loaded ? styles.loaded : ''}`}
      style={{ animationDelay: `${stagger}s` }}
    >
      <div
        className={`${styles.imageWrapper} noImageSave ${onOpenPhotoInSlider ? styles.imageWrapperClickable : ''}`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <GalleryImage
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes={coverSizesVh(
            photo.width,
            photo.height,
            GRID_ROW_MAX_HEIGHT_VH,
            landscape ? GRID_LANDSCAPE_CELL_MAX_WIDTH_VH : GRID_PORTRAIT_CELL_MAX_WIDTH_VH
          )}
          eager={near}
          highPriority={index < GRID_HIGH_PRIORITY_COUNT}
          onLoad={() => setLoaded(true)}
          className={styles.imageFill}
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
});

export default function MasonryGrid({ photos, onOpenPhotoInSlider }: MasonryGridProps) {
  const masonryRef = useRef<HTMLDivElement>(null);
  const observe = useScrollerPrefetch(masonryRef);

  useHorizontalPointerDragScroll(masonryRef, {
    dragThreshold: 12,
    clickSlopPx: 5,
    suppressNextClickAfterDrag: true,
    allowPointerDownOnInteractive: true,
  });

  if (photos.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No photos yet</p>
      </div>
    );
  }

  return (
    <div ref={masonryRef} className={styles.masonry}>
      {photos.map((photo, index) => (
        <GridTile
          key={photo.id}
          photo={photo}
          index={index}
          observe={observe}
          onOpenPhotoInSlider={onOpenPhotoInSlider}
        />
      ))}
    </div>
  );
}
