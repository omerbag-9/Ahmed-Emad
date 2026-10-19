'use client';

import { useEffect, useRef, useState } from 'react';
import GalleryImage from '@/components/GalleryImage';
import { cloudinaryPlaceholder } from '@/lib/cloudinaryImage';
import styles from './GalleryPhoto.module.css';

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  eager: boolean;
  highPriority?: boolean;
};

/**
 * A gallery photo over a 32px blurred placeholder. The sharp file fades in over it once loaded and
 * the placeholder is then removed, so no blur is left around a finished photo. Fills its parent,
 * which must be positioned and clip its overflow.
 */
export default function GalleryPhoto({ src, alt, width, height, sizes, eager, highPriority }: Props) {
  const placeholder = cloudinaryPlaceholder(src);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [placeholderGone, setPlaceholderGone] = useState(!placeholder);

  /* A photo that finished loading before hydration never fires onLoad */
  useEffect(() => {
    const img = wrapRef.current?.querySelector<HTMLImageElement>('img[data-ae-photo]');
    if (img?.complete && img.naturalWidth > 0) queueMicrotask(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || placeholderGone) return;
    const t = setTimeout(() => setPlaceholderGone(true), 560);
    return () => clearTimeout(t);
  }, [loaded, placeholderGone]);

  return (
    <span ref={wrapRef} className={styles.wrap}>
      {placeholder && !placeholderGone ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny Cloudinary placeholder
        <img className={styles.placeholder} src={placeholder} alt="" aria-hidden draggable={false} />
      ) : null}
      <GalleryImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        eager={eager}
        highPriority={highPriority}
        className={`${styles.photo} ${loaded ? styles.loaded : ''}`}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}
