import type { Metadata } from 'next';
import Image from 'next/image';
import { getAboutContent } from '@/lib/about';
import styles from './about.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const a = await getAboutContent();
  const desc = a.lead.trim().slice(0, 160) || 'About the practice.';
  return {
    title: `${a.title.trim() || 'About'} | Ahmed Emad Photographs`,
    description: desc.length >= 160 ? `${desc}…` : desc,
  };
}

export default async function AboutPage() {
  const a = await getAboutContent();
  const paragraphs = [a.lead, a.body, a.bodyExtra].map((p) => p.trim()).filter(Boolean);
  const hasImage = Boolean(a.imageSrc?.trim());

  return (
    <article className={styles.shell}>
      <div className={`${styles.layout} ${hasImage ? '' : styles.layoutNoImage}`}>
        {hasImage ? (
          <div className={styles.visual}>
            <div className={styles.portraitBlock}>
              <div className={styles.frame} aria-hidden />
              <div className={`${styles.imageWrap} noImageSave`}>
                <Image
                  src={a.imageSrc}
                  alt={a.imageAlt.trim() || 'Portrait'}
                  fill
                  className={styles.portrait}
                  sizes="(max-width: 900px) min(100vw, 22rem), 28vw"
                  priority
                  draggable={false}
                />
              </div>
            </div>
            <p className={styles.eyebrow}>{a.eyebrow.trim() || 'About'}</p>
          </div>
        ) : null}

        <div className={styles.copy}>
          {!hasImage ? (
            <p className={styles.eyebrow}>{a.eyebrow.trim() || 'About'}</p>
          ) : null}
          <h1 className={styles.title}>{a.title.trim() || 'About'}</h1>
          <div className={styles.divider} aria-hidden />
          <div className={styles.body}>
            {paragraphs.map((text, i) => (
              <p key={i} className={i === 0 ? styles.lead : styles.para}>
                {text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
