'use client';

import ResponsiveGallery from '@/components/ResponsiveGallery';
import type { NextProject } from '@/components/MasonryGrid';
import type { Photo } from '@/lib/types';
import portfolioStyles from './portfolio.module.css';

export default function PortfolioGalleryClient({ photos, nextProject }: { photos: Photo[]; nextProject?: NextProject }) {
  return (
    <div className={portfolioStyles.pageRoot}>
      <ResponsiveGallery photos={photos} title="Portfolio" nextProject={nextProject} />
    </div>
  );
}
