import PhotoShareProtect from '@/components/PhotoShareProtect';
import { getPlaces } from '@/lib/data';
import { getPortfolioPhotoById } from '@/lib/portfolio';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { shouldUnoptimizeNextImage } from '@/lib/shouldUnoptimizeNextImage';
import styles from './photo.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const portfolioPhoto = await getPortfolioPhotoById(id);
  if (portfolioPhoto) {
    const title = portfolioPhoto.alt || 'Portfolio';
    return {
      title: `${title} — Ahmed Emad Photographs`,
      description: 'Architectural photography by Ahmed Emad',
      openGraph: {
        title: `${title} — Ahmed Emad Photographs`,
        description: 'Architectural photography by Ahmed Emad',
        images: [{ url: portfolioPhoto.src, width: portfolioPhoto.width, height: portfolioPhoto.height }],
      },
    };
  }

  const places = await getPlaces();

  for (const place of places) {
    const photo = place.photos.find(p => p.id === id);
    if (photo) {
      return {
        title: `${place.name} — Ahmed Emad Photographs`,
        description: `Architectural photography of ${place.name} by Ahmed Emad`,
        openGraph: {
          title: `${place.name} — Ahmed Emad Photographs`,
          description: `Architectural photography of ${place.name}`,
          images: [{ url: photo.src, width: photo.width, height: photo.height }],
        },
      };
    }
  }

  return { title: 'Photo — Ahmed Emad Photographs' };
}

export default async function PhotoPage({ params }: Props) {
  const { id } = await params;
  const portfolioPhoto = await getPortfolioPhotoById(id);

  if (portfolioPhoto) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandFirst}>AHMED</span>
            <span className={styles.brandBold}>EMAD</span>
          </Link>
          <Link href="/portfolio" className={styles.viewProject}>
            ← Main portfolio
          </Link>
        </div>

        <div className={styles.imageSection}>
          <PhotoShareProtect className={`${styles.imageContainer} noImageSave`}>
            <Image
              src={portfolioPhoto.src}
              alt={portfolioPhoto.alt}
              width={portfolioPhoto.width}
              height={portfolioPhoto.height}
              quality={85}
              unoptimized={shouldUnoptimizeNextImage(portfolioPhoto.src)}
              priority
              className={styles.image}
              draggable={false}
            />
            <div className={styles.imageProtect} aria-hidden />
          </PhotoShareProtect>
        </div>

        <div className={styles.info}>
          <h1 className={styles.placeName}>{portfolioPhoto.alt || 'Portfolio'}</h1>
          <p className={styles.photoMeta}>Main portfolio</p>
        </div>
      </main>
    );
  }

  const places = await getPlaces();

  let foundPhoto = null;
  let foundPlace = null;

  for (const place of places) {
    const photo = place.photos.find(p => p.id === id);
    if (photo) {
      foundPhoto = photo;
      foundPlace = place;
      break;
    }
  }

  if (!foundPhoto || !foundPlace) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandFirst}>AHMED</span>
          <span className={styles.brandBold}>EMAD</span>
        </Link>
        <Link href={`/portfolio/${foundPlace.slug}`} className={styles.viewProject}>
          View full project →
        </Link>
      </div>

      <div className={styles.imageSection}>
        <PhotoShareProtect className={`${styles.imageContainer} noImageSave`}>
          <Image
            src={foundPhoto.src}
            alt={foundPhoto.alt}
            width={foundPhoto.width}
            height={foundPhoto.height}
            quality={85}
            unoptimized={shouldUnoptimizeNextImage(foundPhoto.src)}
            priority
            className={styles.image}
            draggable={false}
          />
          <div className={styles.imageProtect} aria-hidden />
        </PhotoShareProtect>
      </div>

      <div className={styles.info}>
        <h1 className={styles.placeName}>{foundPlace.name}</h1>
        {foundPlace.location?.trim() ? (
          <p className={styles.photoMeta}>{foundPlace.location.trim()}</p>
        ) : null}
      </div>
    </main>
  );
}
