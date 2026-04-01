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
  /** Project name only (grid mode); hidden in horizontal gallery / slider */
  projectTitle?: string;
  /** Shown beside the title in grid mode when set (e.g. city / region) */
  projectLocation?: string;
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

/** Shown in grid mode FAB — filled rectangle (switch to horizontal gallery) */
function IconFilledRectangle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <rect x="1.5" y="5.5" width="22" height="15"  fill="currentColor" />
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

/** Grid project header only (not sidebar): pin + title + optional location */
function GridProjectHeading({ title, location }: { title: string; location?: string }) {
  const loc = location?.trim();
  return (
    <header className={styles.projectTopBar}>
      <h1 className={styles.projectTopHeading}>
        <span className={styles.projectTopNameGroup}>
          <svg
            className={styles.projectTopPin}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.55"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 21c-3-2.5-7-7.2-7-11a7 7 0 1 1 14 0c0 3.8-4 8.5-7 11z" />
            <circle cx="12" cy="10" r="2.25" />
          </svg>
          <span className={styles.projectTopTitle}>{title}</span>
        </span>
        {loc ? <span className={styles.projectTopLocation}>{loc}</span> : null}
      </h1>
    </header>
  );
}

export default function ResponsiveGallery({ photos, projectTitle, projectLocation }: ResponsiveGalleryProps) {
  const mobileNavOpen = useMobileSidebarOpen();
  const [isMobile, setIsMobile] = useState(false);
  const [mode, setMode] = useState<ViewMode>('grid');
  const [hydrated, setHydrated] = useState(false);
  /** When opening the horizontal gallery from a grid tile, scroll to this photo */
  const [sliderFocusPhotoId, setSliderFocusPhotoId] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setIsMobile(mq.matches);
    queueMicrotask(() => apply());
    mq.addEventListener('change', apply);

    queueMicrotask(() => {
      const stored = readStoredMode();
      if (stored) setMode(stored);
      setHydrated(true);
    });

    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-ae-gallery', mode);
    return () => {
      document.documentElement.removeAttribute('data-ae-gallery');
    };
  }, [hydrated, mode]);

  const setModePersist = useCallback((m: ViewMode) => {
    setMode(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = useCallback(() => {
    if (mode === 'grid') {
      /* FAB → slider: always start at strip start; avoids stale focus from a prior open */
      setSliderFocusPhotoId(null);
      setModePersist('slider');
    } else {
      setSliderFocusPhotoId(null);
      setModePersist('grid');
    }
  }, [mode, setModePersist]);

  const openSliderAtPhoto = useCallback(
    (photoId: string) => {
      setSliderFocusPhotoId(photoId);
      setModePersist('slider');
    },
    [setModePersist]
  );

  const switchToGrid = useCallback(() => {
    setSliderFocusPhotoId(null);
    setModePersist('grid');
  }, [setModePersist]);

  const galleryBody =
    mode === 'grid' ? (
      <MasonryGrid photos={photos} onOpenPhotoInSlider={openSliderAtPhoto} />
    ) : (
      <PhotoSlider
        photos={photos}
        initialFocusPhotoId={sliderFocusPhotoId}
        onSwitchToGrid={switchToGrid}
      />
    );

  if (!hydrated) {
    return (
      <div className={`${styles.wrap} ${styles.wrapWithToolbar}`}>
        {projectTitle ? (
          <GridProjectHeading title={projectTitle} location={projectLocation} />
        ) : null}
        <div className={styles.galleryStage}>
          <MasonryGrid photos={photos} onOpenPhotoInSlider={openSliderAtPhoto} />
        </div>
      </div>
    );
  }

  const fabNavOpen = mobileNavOpen && isMobile;

  const floatButton = (
    <button
      type="button"
      className={`${styles.floatToggle} ${fabNavOpen ? styles.floatToggleNavOpen : ''}`}
      onClick={toggleMode}
      aria-label={mode === 'grid' ? 'Switch to horizontal gallery' : 'Switch to grid view'}
    >
      {mode === 'grid' ? <IconFilledRectangle /> : <IconSliderMode />}
    </button>
  );

  return (
    <>
      <div className={`${styles.wrap} ${styles.wrapWithToolbar}`}>
        {projectTitle && mode !== 'slider' ? (
          <GridProjectHeading title={projectTitle} location={projectLocation} />
        ) : null}
        <div className={styles.galleryStage}>{galleryBody}</div>
      </div>

      {typeof document !== 'undefined' && mode === 'grid'
        ? createPortal(floatButton, document.body)
        : null}
    </>
  );
}
