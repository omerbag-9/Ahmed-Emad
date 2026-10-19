'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import BlurText from '@/components/motion/BlurText';
import Magnet from '@/components/motion/Magnet';
import Reveal from '@/components/motion/Reveal';
import { gallerySrcSet } from '@/lib/cloudinaryImage';
import type { HomeSlide } from '@/lib/home';
import styles from './page.module.css';

const INTERVAL_MS = 6500;

export default function HomeHero({ slides, lede }: { slides: HomeSlide[]; lede: string }) {
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
        <div key={s.src} className={`${styles.pic} ${i === current ? styles.picOn : ''}`} aria-hidden={i !== current}>
          {/* eslint-disable-next-line @next/next/no-img-element -- responsive Cloudinary srcset */}
          <img
            src={s.src}
            srcSet={gallerySrcSet(s.src, s.width)}
            sizes="100vw"
            alt={s.name ? `${s.name}${s.location ? `, ${s.location}` : ''}` : 'Architectural photograph by Ahmed Emad'}
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
          {lede.trim() ? (
            <Reveal as="p" step={1} className={styles.lede}>
              {lede}
            </Reveal>
          ) : null}
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
            {/* Main-portfolio photos belong to no project, so they have no caption */}
            {slide.slug ? (
              <p key={slide.src} className={styles.captionText}>
                <Link href={`/portfolio/${slide.slug}`}>{slide.name}</Link>
                {slide.location?.trim() ? slide.location.trim() : null}
              </p>
            ) : null}
            {slides.length > 1 ? (
              <div className={styles.dots} role="group" aria-label="Choose photograph">
                {slides.map((s, i) => (
                  <button
                    key={s.src}
                    type="button"
                    aria-label={s.name || `Photograph ${i + 1}`}
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
