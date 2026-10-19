'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import BlurText from '@/components/motion/BlurText';
import Magnet from '@/components/motion/Magnet';
import Reveal from '@/components/motion/Reveal';
import { gallerySrcSet } from '@/lib/cloudinaryImage';
import styles from './page.module.css';

export type HomeSlide = {
  slug: string;
  name: string;
  location?: string;
  src: string;
  width: number;
  height: number;
};

const INTERVAL_MS = 6500;

export default function HomeHero({ slides }: { slides: HomeSlide[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [slides.length, current]);

  const slide = slides[current];

  return (
    <main className={styles.home}>
      {slides.map((s, i) => (
        <div key={s.slug} className={`${styles.pic} ${i === current ? styles.picOn : ''}`} aria-hidden={i !== current}>
          {/* eslint-disable-next-line @next/next/no-img-element -- responsive Cloudinary srcset */}
          <img
            src={s.src}
            srcSet={gallerySrcSet(s.src, s.width)}
            sizes="100vw"
            alt={`${s.name}${s.location ? `, ${s.location}` : ''}`}
            /* All load up front (later ones at low priority) so a crossfade never fades to an empty frame */
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding="async"
            draggable={false}
          />
        </div>
      ))}
      <div className={styles.scrim} aria-hidden />

      <nav className={styles.nav} aria-label="Main">
        <Link href="/portfolio">Portfolio</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </nav>

      <div className={styles.body}>
        <div>
          <h1 className={styles.name} aria-label="Ahmed Emad Photographs">
            <BlurText text="AHMED" className={styles.first} />
            <BlurText text="EMAD" start={260} />
          </h1>
          <Reveal as="p" step={1} className={styles.lede}>
            Architectural photography in Cairo: interiors, residences and the spaces people work in.
          </Reveal>
          <Reveal step={2} className={styles.cta}>
            <Magnet strength={0.25}>
              <Link href="/portfolio" className={styles.button}>
                View portfolio
                <Icon name="arrow-right" size={16} />
              </Link>
            </Magnet>
          </Reveal>
        </div>

        {slide ? (
          <Reveal step={3} className={styles.caption}>
            <p key={slide.slug} className={styles.captionText}>
              <Link href={`/portfolio/${slide.slug}`}>{slide.name}</Link>
              {slide.location?.trim() ? slide.location.trim() : null}
            </p>
            {slides.length > 1 ? (
              <div className={styles.dots} role="group" aria-label="Choose photograph">
                {slides.map((s, i) => (
                  <button
                    key={s.slug}
                    type="button"
                    aria-label={s.name}
                    aria-current={i === current}
                    onClick={() => setCurrent(i)}
                  >
                    <i />
                  </button>
                ))}
              </div>
            ) : null}
          </Reveal>
        ) : null}
      </div>
    </main>
  );
}
