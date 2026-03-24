'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import PhotoShareButton from '@/components/PhotoShareButton';
import styles from './MasonryGrid.module.css';

const MOBILE_GRID_MQ = '(max-width: 900px)';

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
}

export default function MasonryGrid({ photos }: MasonryGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [mobileTwoCol, setMobileTwoCol] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_GRID_MQ);
    const apply = () => setMobileTwoCol(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

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
    <div className={`${styles.masonry} ${mobileTwoCol ? styles.masonryMobileTwoCol : ''}`}>
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className={`${styles.item} ${loadedImages.has(photo.id) ? styles.loaded : ''}`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div
            className={`${styles.imageWrapper} noImageSave`}
            onContextMenu={(e) => e.preventDefault()}
          >
            {mobileTwoCol ? (
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="50vw"
                loading={index < 8 ? 'eager' : 'lazy'}
                quality={80}
                onLoad={() => handleImageLoad(photo.id)}
                className={styles.imageFill}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            ) : (
              <Image
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 1200px) 33vw, 33vw"
                loading={index < 6 ? 'eager' : 'lazy'}
                quality={80}
                onLoad={() => handleImageLoad(photo.id)}
                className={styles.image}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            )}
            <div className={styles.shareWrap}>
              <PhotoShareButton photoId={photo.id} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
