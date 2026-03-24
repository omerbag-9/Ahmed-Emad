'use client';

import { useState, useEffect } from 'react';
import ResponsiveGallery from '@/components/ResponsiveGallery';
import PageLoader from '@/components/PageLoader';
import portfolioStyles from './portfolio.module.css';

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  width: number;
  height: number;
}

export default function PortfolioPage() {
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portfolio')
      .then((res) => res.json())
      .then((data) => {
        setAllPhotos(data.photos || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={portfolioStyles.pageRoot}>
        <PageLoader caption="Gallery" />
      </div>
    );
  }

  return (
    <div className={portfolioStyles.pageRoot}>
      <ResponsiveGallery photos={allPhotos} />
    </div>
  );
}
