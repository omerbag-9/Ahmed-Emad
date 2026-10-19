import PhotoShareProtect from '@/components/PhotoShareProtect';
import Icon from '@/components/Icon';
import { getPlaces } from '@/lib/data';
import { getPortfolioPhotoById } from '@/lib/portfolio';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Photo } from '@/lib/types';
import { shouldUnoptimizeNextImage } from '@/lib/shouldUnoptimizeNextImage';
import CopyLinkButton from './CopyLinkButton';
import styles from './photo.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

type Found = { photo: Photo; title: string; meta: string; back: { href: string; label: string } };

async function findPhoto(id: string): Promise<Found | null> {
  const portfolioPhoto = await getPortfolioPhotoById(id);
  if (portfolioPhoto) {
    return {
      photo: portfolioPhoto,
      title: 'Portfolio',
      meta: 'Main portfolio',
      back: { href: '/portfolio', label: 'View the portfolio' },
    };
  }
  for (const place of await getPlaces()) {
    const photo = place.photos.find((p) => p.id === id);
    if (photo) {
      return {
        photo,
        title: place.name,
        meta: place.location?.trim() || '',
        back: { href: `/portfolio/${place.slug}`, label: 'View full project' },
      };
    }
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const found = await findPhoto(id);
  /* absolute: the root layout template would add the suffix a second time */
  if (!found) return { title: { absolute: 'Photo — Ahmed Emad Photographs' } };
  const { photo, title } = found;
  return {
    title: { absolute: `${title} — Ahmed Emad Photographs` },
    description: `Architectural photography${title !== 'Portfolio' ? ` of ${title}` : ''} by Ahmed Emad`,
    openGraph: {
      title: `${title} — Ahmed Emad Photographs`,
      description: 'Architectural photography by Ahmed Emad',
      images: [{ url: photo.src, width: photo.width, height: photo.height }],
    },
  };
}

export default async function PhotoPage({ params }: Props) {
  const { id } = await params;
  const found = await findPhoto(id);
  if (!found) notFound();
  const { photo, title, meta, back } = found;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Ahmed Emad Photographs, home">
          <span className={styles.brandFirst}>AHMED</span>
          <span>EMAD</span>
        </Link>
        <Link href={back.href} className={styles.link}>
          {back.label}
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>

      <div className={styles.imageSection}>
        <PhotoShareProtect className={`${styles.imageContainer} noImageSave`}>
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            quality={85}
            unoptimized={shouldUnoptimizeNextImage(photo.src)}
            preload
            className={styles.image}
            draggable={false}
          />
          <div className={styles.imageProtect} aria-hidden />
        </PhotoShareProtect>
      </div>

      <div className={styles.info}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {meta ? <p className={styles.meta}>{meta}</p> : null}
        </div>
        <CopyLinkButton />
      </div>
    </main>
  );
}
