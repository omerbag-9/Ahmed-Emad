'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { MobileSidebarOpenContext } from '@/components/MobileSidebarContext';
import styles from './portfolio.module.css';

type Variant = 'gallery' | 'page';

export default function PortfolioLayoutClient({
  categories,
  places,
  children,
  variant = 'gallery',
}: {
  categories: string[];
  places: {
    id: string;
    name: string;
    slug: string;
    category: string;
    location?: string;
  }[];
  children: React.ReactNode;
  variant?: Variant;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const innerClassName =
    variant === 'page'
      ? `${styles.mainInner} ${styles.mainInnerPage}`
      : styles.mainInner;

  return (
    <MobileSidebarOpenContext.Provider value={mobileOpen}>
      <div className={styles.layout}>
        <Sidebar
          categories={categories}
          places={places}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
        />
        <main className={styles.main}>
          <div className={innerClassName}>{children}</div>
        </main>
      </div>
    </MobileSidebarOpenContext.Provider>
  );
}
