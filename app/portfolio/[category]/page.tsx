'use client';

import { useState, useEffect, use } from 'react';
import ResponsiveGallery from '@/components/ResponsiveGallery';
import PageLoader from '@/components/PageLoader';
import portfolioStyles from '../portfolio.module.css';
import styles from './category.module.css';

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
  photos: Photo[];
}

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const [places, setPlaces] = useState<Place[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

  useEffect(() => {
    setLoading(true);
    fetch('/api/places')
      .then((res) => res.json())
      .then((data) => {
        const filtered = (data.places || []).filter(
          (p: Place) => p.category.toLowerCase() === category.toLowerCase()
        );
        setPlaces(filtered);
        const photos = filtered.flatMap((p: Place) => p.photos);
        setAllPhotos(photos);
      })
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <div className={portfolioStyles.pageRoot}>
        <PageLoader caption="Collection" />
      </div>
    );
  }

  return (
    <div className={portfolioStyles.pageRoot}>
      <div className={styles.header}>
        <h1 className={styles.title}>{categoryName}</h1>
        <p className={styles.count}>
          {allPhotos.length} photos · {places.length} projects
        </p>
      </div>

      <ResponsiveGallery photos={allPhotos} />
    </div>
  );
}
