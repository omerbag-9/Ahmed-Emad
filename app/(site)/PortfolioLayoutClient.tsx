'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import styles from './portfolio/portfolio.module.css';

export type SidebarPlace = {
  id: string;
  name: string;
  slug: string;
  location?: string;
  photoCount: number;
  cover: string;
};

const RAIL_KEY = 'ae-sidebar-rail';

export default function PortfolioLayoutClient({
  places,
  portfolioCount,
  children,
}: {
  places: SidebarPlace[];
  portfolioCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [rail, setRail] = useState(false);
  /* Gallery routes fill the screen; About and Contact are pages that scroll */
  const isGallery = pathname === '/portfolio' || pathname.startsWith('/portfolio/');

  useEffect(() => {
    try {
      if (localStorage.getItem(RAIL_KEY) === '1') queueMicrotask(() => setRail(true));
    } catch {
      /* ignore */
    }
  }, []);

  const changeRail = (on: boolean) => {
    setRail(on);
    try {
      localStorage.setItem(RAIL_KEY, on ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className={`${styles.layout} ${rail ? styles.layoutRail : ''}`}>
        <Sidebar
          places={places}
          portfolioCount={portfolioCount}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
          rail={rail}
          onRailChange={changeRail}
        />
        <main className={`${styles.main} ${isGallery ? styles.mainGallery : styles.mainPage}`}>{children}</main>
      </div>
    </>
  );
}
