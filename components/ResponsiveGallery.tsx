'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMobileSidebarOpen } from '@/components/MobileSidebarContext';
import MasonryGrid from './MasonryGrid';
import PhotoSlider from './PhotoSlider';
import styles from './ResponsiveGallery.module.css';

const STORAGE_KEY = 'ae-portfolio-view';
const MOBILE_MQ = '(max-width: 900px)';

type ViewMode = 'grid' | 'slider';

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  width: number;
  height: number;
}

interface ResponsiveGalleryProps {
  photos: Photo[];
}

function readStoredMode(): ViewMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'grid' || v === 'slider') return v;
  } catch {
    /* ignore */
  }
  return null;
}

/** Grid mode icon */
function IconNineSquares() {
  const u = 4.5;
  const g = 2;
  const o = 3.25;
  const cells = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={o + col * (u + g)}
          y={o + row * (u + g)}
          width={u}
          height={u}
          rx={0.35}
          fill="currentColor"
        />
      );
    }
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      {cells}
    </svg>
  );
}

/** Slider mode icon */
function IconSliderMode() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.25" y="7.75" width="17.5" height="8.5" rx="1.25" />
      <path d="M4.5 12H3M21 12h-1.5" />
      <circle cx="9" cy="19" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="19" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ResponsiveGallery({ photos }: ResponsiveGalleryProps) {
  const mobileNavOpen = useMobileSidebarOpen();
  const [isMobile, setIsMobile] = useState(false);
  const [mode, setMode] = useState<ViewMode>('grid');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);

    const stored = readStoredMode();
    if (stored) setMode(stored);
    setHydrated(true);

    return () => mq.removeEventListener('change', apply);
  }, []);

  const setModePersist = useCallback((m: ViewMode) => {
    setMode(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModePersist(mode === 'grid' ? 'slider' : 'grid');
  }, [mode, setModePersist]);

  if (!hydrated) {
    return (
      <div className={styles.wrap}>
        <MasonryGrid photos={photos} />
      </div>
    );
  }

  const fabNavOpen = mobileNavOpen && isMobile;

  const floatButton = (
    <button
      type="button"
      className={`${styles.floatToggle} ${fabNavOpen ? styles.floatToggleNavOpen : ''}`}
      onClick={toggleMode}
      aria-label={mode === 'grid' ? 'Switch to slider view' : 'Switch to grid view'}
    >
      {mode === 'grid' ? <IconNineSquares /> : <IconSliderMode />}
    </button>
  );

  return (
    <>
      <div className={`${styles.wrap} ${styles.wrapWithToolbar}`}>
        {mode === 'grid' ? (
          <MasonryGrid photos={photos} />
        ) : (
          <PhotoSlider photos={photos} />
        )}
      </div>

      {typeof document !== 'undefined' ? createPortal(floatButton, document.body) : null}
    </>
  );
}
