import { gallerySrcSet } from '@/lib/cloudinaryImage';

type Props = {
  src: string;
  alt: string;
  /** Native pixel size of the stored photo */
  width: number;
  height: number;
  /** Display width hint for `srcset` selection (see `coverSizesVh`) */
  sizes: string;
  /** Start fetching now instead of waiting for the browser's lazy heuristic */
  eager: boolean;
  highPriority?: boolean;
  className?: string;
  onLoad?: () => void;
};

/**
 * Gallery photo as a plain <img> with a Cloudinary `srcset`: the browser downloads one file sized
 * for the tile and the screen's pixel density, up to the untouched original.
 */
export default function GalleryImage({
  src,
  alt,
  width,
  height,
  sizes,
  eager,
  highPriority = false,
  className,
  onLoad,
}: Props) {
  const srcSet = gallerySrcSet(src, width);
  /* loading / sizes / srcSet are set before src so no browser starts fetching the full original first */
  return (
    // eslint-disable-next-line @next/next/no-img-element -- responsive Cloudinary srcset; Next optimizer is not used for these
    <img
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={highPriority ? 'high' : 'auto'}
      decoding="async"
      width={Math.max(width, 1)}
      height={Math.max(height, 1)}
      sizes={srcSet ? sizes : undefined}
      srcSet={srcSet}
      src={src}
      className={className}
      draggable={false}
      data-ae-photo=""
      onDragStart={(e) => e.preventDefault()}
      onLoad={onLoad}
    />
  );
}
