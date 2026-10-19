import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/Icon';
import BlurText from '@/components/motion/BlurText';
import Magnet from '@/components/motion/Magnet';
import Reveal from '@/components/motion/Reveal';
import { getAboutContent } from '@/lib/about';
import { cloudinaryWidth } from '@/lib/cloudinaryImage';
import { getPlacesForRender, placesWithSortedPhotos } from '@/lib/data';
import { shouldUnoptimizeNextImage } from '@/lib/shouldUnoptimizeNextImage';
import styles from './about.module.css';

/** CMS content — must not use the static full-route cache or production stays stale after admin edits */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const a = await getAboutContent();
  const desc = a.lead.trim().slice(0, 160) || 'About the practice.';
  return {
    /* absolute: the root layout template would add the suffix a second time */
    title: { absolute: `${a.title.trim() || 'About'} | Ahmed Emad Photographs` },
    description: desc.length >= 160 ? `${desc}…` : desc,
  };
}

export default async function AboutPage() {
  const [a, rawPlaces] = await Promise.all([getAboutContent(), getPlacesForRender()]);
  const places = placesWithSortedPhotos(rawPlaces);
  const lead = a.lead.trim();
  const body = a.body.trim();
  /* The last paragraph is the closing line, set as a quote */
  const closing = a.bodyExtra.trim();
  const hasImage = Boolean(a.imageSrc?.trim());

  return (
    <article className={`${styles.shell} ${hasImage ? '' : styles.noImage}`} aria-labelledby="about-title">
      {hasImage ? (
        <Reveal as="figure" className={`${styles.portrait} noImageSave`}>
          <Image
            src={a.imageSrc}
            alt={a.imageAlt.trim() || 'Portrait'}
            fill
            className={styles.portraitImg}
            sizes="(max-width: 900px) min(100vw, 26rem), 30vw"
            unoptimized={shouldUnoptimizeNextImage(a.imageSrc)}
            preload
            draggable={false}
          />
        </Reveal>
      ) : null}

      <div className={styles.copy}>
        <h1 className={styles.title} id="about-title">
          <BlurText text={a.title.trim() || 'About'} />
        </h1>
        {lead ? (
          <Reveal as="p" step={1} className={styles.lead}>
            {lead}
          </Reveal>
        ) : null}
        {body ? (
          <Reveal as="p" step={2} className={styles.body}>
            {body}
          </Reveal>
        ) : null}
        {closing ? (
          <Reveal as="blockquote" step={3} className={styles.quote}>
            {closing}
          </Reveal>
        ) : null}

        {places.length ? (
          <Reveal step={4} className={styles.projects}>
            <h2>Recent projects</h2>
            <ul>
              {places.map((p) => {
                const cover = p.photos[0]?.src || p.coverImage;
                return (
                  <li key={p.id}>
                    <Link href={`/portfolio/${p.slug}`}>
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element -- small Cloudinary thumbnail
                        <img src={cloudinaryWidth(cover, 160)} alt="" loading="lazy" draggable={false} />
                      ) : (
                        <span className={styles.noThumb} />
                      )}
                      <span>
                        <b>{p.name}</b>
                        {p.location?.trim() ? p.location.trim() : null}
                      </span>
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        ) : null}

        <Reveal step={5} className={styles.cta}>
          <Magnet strength={0.2}>
            <Link href="/contact" className={styles.button}>
              Book a shoot
              <Icon name="arrow-right" size={16} />
            </Link>
          </Magnet>
        </Reveal>
      </div>
    </article>
  );
}
