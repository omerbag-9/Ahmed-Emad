'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Icon from '@/components/Icon';
import BlurText from '@/components/motion/BlurText';
import MasonryGrid, { type NextProject } from './MasonryGrid';
import PhotoSlider from './PhotoSlider';
import CinemaReel from './cinematic/CinemaReel';
import LouvreSlides from './cinematic/LouvreSlides';
import SpotlightStrip from './cinematic/SpotlightStrip';
import styles from './ResponsiveGallery.module.css';

const STORAGE_KEY = 'ae-portfolio-view';

/*
 * Proof of concept: three cinematic slideshow looks beside the current strip, switchable from the
 * title bar (or ?look=a|b|c|now in the address). Once one is picked the others and this picker go.
 */
const LOOK_KEY = 'ae-slider-look';
const LOOKS = [
  { id: 'now', label: 'Now', name: 'Current strip' },
  { id: 'a', label: 'A', name: 'Screening' },
  { id: 'b', label: 'B', name: 'Walkthrough' },
  { id: 'c', label: 'C', name: 'Louvres' },
] as const;
type Look = (typeof LOOKS)[number]['id'];
const SLIDESHOWS = { now: PhotoSlider, a: CinemaReel, b: SpotlightStrip, c: LouvreSlides };

function readLook(): Look | null {
  try {
    const q = new URLSearchParams(location.search).get('look');
    const v = q ?? localStorage.getItem(LOOK_KEY);
    if (LOOKS.some((l) => l.id === v)) return v as Look;
  } catch {
    /* ignore */
  }
  return null;
}

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
  /** Title in the bar: the project name, or "Portfolio" on the main gallery */
  title: string;
  /** Project location, shown beside the title */
  location?: string;
  /** Project pages show a map pin before the title */
  isProject?: boolean;
  /** Last grid tile: the next project to open */
  nextProject?: NextProject;
}

function readStoredMode(): ViewMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'grid' || v === 'slider') return v;
  } catch {
    /* ignore */
  }
  return null;
}

type DocWithVT = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => {
    finished: Promise<void>;
    skipTransition: () => void;
  };
};

export default function ResponsiveGallery({
  photos,
  title,
  location,
  isProject = false,
  nextProject,
}: ResponsiveGalleryProps) {
  const [mode, setMode] = useState<ViewMode>('grid');
  const [look, setLook] = useState<Look>('a');
  /** When opening the strip from a grid tile, centre this photo */
  const [focusPhotoId, setFocusPhotoId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const morphing = useRef(false);

  useEffect(() => {
    const stored = readStoredMode();
    const storedLook = readLook();
    queueMicrotask(() => {
      if (stored) setMode(stored);
      if (storedLook) setLook(storedLook);
    });
  }, []);

  const persist = useCallback((m: ViewMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  /** Switch views with a plain crossfade (view control, Esc) */
  const switchMode = useCallback(
    (m: ViewMode) => {
      if (m === mode) return;
      persist(m);
      const apply = () =>
        flushSync(() => {
          setFocusPhotoId(null);
          setMode(m);
        });
      const doc = document as DocWithVT;
      if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) apply();
      else doc.startViewTransition(apply);
    },
    [mode, persist]
  );

  /**
   * Grid tile → strip: the clicked photo grows into its place in the strip (View Transitions API).
   * The strip's copy is given the file the tile already shows, decoded before the "after" picture,
   * so nothing flashes; the strip-sized file swaps in once the move is over.
   */
  const openInStrip = useCallback(
    (photoId: string, tileImg: HTMLImageElement | null) => {
      persist('slider');
      const doc = document as DocWithVT;
      const render = () =>
        flushSync(() => {
          setFocusPhotoId(photoId);
          setMode('slider');
        });
      if (
        !doc.startViewTransition ||
        !tileImg ||
        morphing.current ||
        document.visibilityState === 'hidden' ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        render();
        return;
      }
      morphing.current = true;
      const html = document.documentElement;
      tileImg.style.viewTransitionName = 'ae-morph';
      html.classList.add('ae-vt-morph');

      let target: HTMLImageElement | null = null;
      let restore: (() => void) | null = null;
      let ran = false;
      const t = doc.startViewTransition(async () => {
        ran = true;
        tileImg.style.viewTransitionName = '';
        render();
        const slide = stageRef.current?.querySelector<HTMLElement>(`[data-photo-id="${CSS.escape(photoId)}"]`);
        target = slide?.querySelector<HTMLImageElement>('img[data-ae-photo]') ?? null;
        if (!target || !slide) return;
        const img = target;
        const placeholder = slide.querySelector<HTMLElement>('img[aria-hidden]');
        const prev = { src: img.getAttribute('src'), srcset: img.getAttribute('srcset') };
        img.removeAttribute('srcset');
        img.src = tileImg.currentSrc || tileImg.src;
        img.style.transition = 'none';
        img.style.opacity = '1';
        if (placeholder) placeholder.style.display = 'none';
        img.style.viewTransitionName = 'ae-morph';
        restore = () => {
          img.style.viewTransitionName = '';
          img.style.transition = '';
          img.style.opacity = '';
          /* Back to the strip-sized candidates; the current file stays visible until one is ready */
          if (prev.srcset) {
            const pre = new Image();
            pre.sizes = img.sizes;
            pre.srcset = prev.srcset;
            pre
              .decode()
              .then(() => {
                if (prev.srcset) img.srcset = prev.srcset;
                if (prev.src) img.setAttribute('src', prev.src);
              })
              .catch(() => {});
          }
        };
        try {
          await img.decode();
        } catch {
          /* shows once loaded */
        }
      });
      /* Safety net: if the page paints no frame for a second (throttled), show the strip without the move */
      setTimeout(() => {
        if (!ran) t.skipTransition();
      }, 1000);
      t.finished.finally(() => {
        morphing.current = false;
        html.classList.remove('ae-vt-morph');
        tileImg.style.viewTransitionName = '';
        restore?.();
      });
    },
    [persist]
  );

  const pickLook = useCallback((l: Look) => {
    try {
      localStorage.setItem(LOOK_KEY, l);
    } catch {
      /* ignore */
    }
    const apply = () => flushSync(() => setLook(l));
    const doc = document as DocWithVT;
    if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) apply();
    else doc.startViewTransition(apply);
  }, []);

  const count = `${photos.length} photograph${photos.length === 1 ? '' : 's'}`;
  const Slideshow = SLIDESHOWS[look];

  return (
    <section className={styles.wrap} aria-labelledby="gallery-title">
      {/* Named inline: CSS Modules would rename a view-transition-name declared in the stylesheet */}
      <header className={styles.bar} style={{ viewTransitionName: 'ae-galbar' }}>
        <h1 className={styles.title} id="gallery-title">
          {isProject ? <Icon name="pin" size={16} className={styles.pin} /> : null}
          <BlurText text={title} className={styles.name} />
          {location?.trim() ? <span className={styles.location}>{location.trim()}</span> : null}
        </h1>
        <div className={styles.side}>
          {mode === 'slider' ? (
            <div className={styles.looks} role="group" aria-label="Slideshow concept">
              {LOOKS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={look === l.id}
                  title={l.name}
                  onClick={() => pickLook(l.id)}
                >
                  {l.label}
                  {look === l.id ? <span className={styles.lookName}>{l.name}</span> : null}
                </button>
              ))}
            </div>
          ) : (
            <span className={styles.count}>{count}</span>
          )}
          <div className={styles.seg} role="group" aria-label="Gallery view" data-mode={mode}>
            <span className={styles.segFill} aria-hidden />
            <button
              type="button"
              aria-pressed={mode === 'grid'}
              aria-label="Grid view"
              title="Grid view"
              onClick={() => switchMode('grid')}
            >
              <Icon name="grid" size={16} />
            </button>
            <button
              type="button"
              aria-pressed={mode === 'slider'}
              aria-label="Strip view"
              title="Strip view"
              onClick={() => switchMode('slider')}
            >
              <Icon name="strip" size={16} />
            </button>
          </div>
        </div>
      </header>
      <div className={styles.stage} ref={stageRef}>
        {mode === 'grid' ? (
          <MasonryGrid photos={photos} onOpenPhotoInSlider={openInStrip} nextProject={nextProject} />
        ) : (
          <Slideshow
            key={look}
            photos={photos}
            initialFocusPhotoId={focusPhotoId}
            onSwitchToGrid={() => switchMode('grid')}
            title={title}
            location={location}
          />
        )}
      </div>
    </section>
  );
}
