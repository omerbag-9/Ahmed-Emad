'use client';

import ResponsiveGallery from '@/components/ResponsiveGallery';
import type { Photo } from '@/lib/types';
import portfolioStyles from './portfolio.module.css';

export default function PortfolioGalleryClient({ photos }: { photos: Photo[] }) {
  return (
    <div className={portfolioStyles.pageRoot}>
      <ResponsiveGallery photos={photos} reserveProjectHeadingSpace />
    </div>
  );
}
