'use client';

import { useState, useEffect, use } from 'react';
import ResponsiveGallery from '@/components/ResponsiveGallery';
import PageLoader from '@/components/PageLoader';
import portfolioStyles from '../../portfolio.module.css';
import styles from '../category.module.css';

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  width: number;
  height: number;
}

interface Place {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  photos: Photo[];
}

export default function PlacePage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = use(params);
  const [place, setPlace] = useState<Place | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch('/api/places')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const found = (data.places || []).find(
          (p: Place) => p.slug === slug && p.category.toLowerCase() === category.toLowerCase()
        );
        setPlace(found || null);
        setStatus(found ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [category, slug]);

  if (status === 'loading') {
    return (
      <div className={portfolioStyles.pageRoot}>
        <PageLoader caption="Project" />
      </div>
    );
  }

  if (status === 'missing' || !place) {
    return (
      <div className={portfolioStyles.pageRoot}>
        <div className={styles.header}>
          <h1 className={styles.title}>Not found</h1>
          <p className={styles.count}>This project does not exist or was removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={portfolioStyles.pageRoot}>
      <div className={styles.header}>
        <h1 className={styles.title}>{place.name}</h1>
        <p className={styles.count}>{place.photos.length} photos</p>
        {place.description && <p className={styles.description}>{place.description}</p>}
      </div>

      <ResponsiveGallery photos={place.photos} />
    </div>
  );
}
