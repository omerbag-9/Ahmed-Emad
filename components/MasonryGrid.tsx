'use client';

import { memo, useRef } from 'react';
import Link from 'next/link';
import GalleryPhoto from '@/components/GalleryPhoto';
import Icon from '@/components/Icon';
import PhotoShareButton from '@/components/PhotoShareButton';
import { cloudinaryWidth, coverSizesVh } from '@/lib/cloudinaryImage';
import {
  GRID_HIGH_PRIORITY_COUNT,
  GRID_INITIAL_EAGER_COUNT,
  GRID_PORTRAIT_CELL_MAX_WIDTH_VH,
  GRID_LANDSCAPE_CELL_MAX_WIDTH_VH,
  GRID_ROW_MAX_HEIGHT_VH,
} from '@/lib/galleryConstants';
import { useHorizontalPointerDragScroll } from '@/lib/useHorizontalPointerDragScroll';
import { useVerticalSwipeScroll } from '@/lib/useVerticalSwipeScroll';
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

export type NextProject = {
  slug: string;
  name: string;
  location?: string;
  cover: string;
  /** "Next project" on a project page, "Start with a project" on the main portfolio */
  label: string;
};

interface MasonryGridProps {
  photos: Photo[];
  /** Click a photo to open the strip on it; gets the tile's image for the morph */
  onOpenPhotoInSlider?: (photoId: string, img: HTMLImageElement | null) => void;
  nextProject?: NextProject;
}

/** Tiles that get the entrance; the rest are off screen when the grid appears */
const ENTRANCE_COUNT = 16;

const GridTile = memo(function GridTile({
  photo,
  index,
  total,
  observe,
  onOpenPhotoInSlider,
}: {
  photo: Photo;
  index: number;
  total: number;
  observe: Observe;
  onOpenPhotoInSlider?: (photoId: string, img: HTMLImageElement | null) => void;
}) {
  const landscape = photo.width > photo.height;
  const [ref, near] = useTileNear<HTMLDivElement>(observe, index < GRID_INITIAL_EAGER_COUNT);

  return (
    <div
      ref={ref}
      className={`${styles.item} ${landscape ? styles.itemLandscape : ''} ${index < ENTRANCE_COUNT ? styles.enter : ''}`}
      style={{ '--i': index } as React.CSSProperties}
      data-photo-id={photo.id}
    >
      <div className={`${styles.imageWrapper} noImageSave`} onContextMenu={(e) => e.preventDefault()}>
        <GalleryPhoto
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
        />
        {onOpenPhotoInSlider ? (
          <button
            type="button"
            className={styles.openInSliderHit}
            onClick={(e) =>
              onOpenPhotoInSlider(
                photo.id,
                e.currentTarget.parentElement?.querySelector<HTMLImageElement>('img[data-ae-photo]') ?? null
              )
            }
            aria-label={`Open photograph ${index + 1} of ${total} in strip view`}
          />
        ) : null}
        <div className={styles.shareWrap} data-ae-no-pan-scroll>
          <PhotoShareButton photoId={photo.id} />
        </div>
      </div>
    </div>
  );
});

export default function MasonryGrid({ photos, onOpenPhotoInSlider, nextProject }: MasonryGridProps) {
  const masonryRef = useRef<HTMLDivElement>(null);
  const observe = useScrollerPrefetch(masonryRef);

  useHorizontalPointerDragScroll(masonryRef, {
    dragThreshold: 12,
    clickSlopPx: 5,
    suppressNextClickAfterDrag: true,
    allowPointerDownOnInteractive: true,
  });
  /* Phones: an up/down swipe moves the grid sideways too */
  useVerticalSwipeScroll(masonryRef);

  if (photos.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No photos yet</p>
        <Link href="/portfolio" className={styles.back}>
          <Icon name="arrow-left" size={16} />
          Back to portfolio
        </Link>
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
          total={photos.length}
          observe={observe}
          onOpenPhotoInSlider={onOpenPhotoInSlider}
        />
      ))}
      {nextProject ? (
        <Link href={`/portfolio/${nextProject.slug}`} className={styles.next} aria-label={`${nextProject.label}: ${nextProject.name}`}>
          {nextProject.cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail
            <img src={cloudinaryWidth(nextProject.cover, 800)} alt="" loading="lazy" draggable={false} />
          ) : null}
          <span className={styles.nextName}>{nextProject.name}</span>
          <span className={styles.nextLine}>
            {nextProject.label}
            {nextProject.location?.trim() ? `, ${nextProject.location.trim()}` : ''}
            <Icon name="arrow-right" size={16} />
          </span>
        </Link>
      ) : null}
    </div>
  );
}
