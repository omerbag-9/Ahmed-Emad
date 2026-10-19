import { getPlacesForRender, placesWithSortedPhotos } from './data';
import { getPortfolioGalleryPhotos } from './portfolio';
import { loadHomeStore, saveHomeStore } from './siteDataStore';

/** `placeId` is a project id, or PORTFOLIO_SOURCE for a photo from the main portfolio. */
export type HomeSlideRef = { placeId: string; photoId: string };

export type HomeContent = {
  /** The line under the name */
  lede: string;
  /** Desktop (landscape screens) background photos in order. Empty = one wide photo per project. */
  slides: HomeSlideRef[];
  /** Phone (portrait screens) background photos in order. Empty = one tall photo per project. */
  mobileSlides: HomeSlideRef[];
};

export type HomeSlide = {
  /** Project the caption links to; empty for main-portfolio photos */
  slug: string;
  name: string;
  location?: string;
  src: string;
  width: number;
  height: number;
};

export const PORTFOLIO_SOURCE = 'portfolio';
export const HOME_LEDE_MAX = 300;
export const HOME_SLIDES_MAX = 12;

export const DEFAULT_HOME: HomeContent = {
  lede: 'Architectural photography in Cairo: interiors, residences and the spaces people work in.',
  slides: [],
  mobileSlides: [],
};

export async function getHomeContent(): Promise<HomeContent> {
  const stored = await loadHomeStore();
  return {
    lede: typeof stored?.lede === 'string' ? stored.lede : DEFAULT_HOME.lede,
    slides: Array.isArray(stored?.slides) ? stored.slides : [],
    mobileSlides: Array.isArray(stored?.mobileSlides) ? stored.mobileSlides : [],
  };
}

function cleanRefs(list: unknown[]): HomeSlideRef[] {
  const seen = new Set<string>();
  return list
    .filter(
      (s): s is HomeSlideRef =>
        !!s && typeof s === 'object' && typeof (s as HomeSlideRef).placeId === 'string' && typeof (s as HomeSlideRef).photoId === 'string'
    )
    .filter((s) => {
      const k = `${s.placeId}/${s.photoId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, HOME_SLIDES_MAX)
    .map(({ placeId, photoId }) => ({ placeId, photoId }));
}

export async function saveHomeContent(patch: { lede?: unknown; slides?: unknown; mobileSlides?: unknown }): Promise<HomeContent> {
  const next = await getHomeContent();
  if (typeof patch.lede === 'string') next.lede = patch.lede.trim().slice(0, HOME_LEDE_MAX);
  if (Array.isArray(patch.slides)) next.slides = cleanRefs(patch.slides);
  if (Array.isArray(patch.mobileSlides)) next.mobileSlides = cleanRefs(patch.mobileSlides);
  await saveHomeStore(next);
  return next;
}

export type HomeSlides = { desktop: HomeSlide[]; mobile: HomeSlide[] };

/**
 * The photos the home page shows, one list for landscape screens and one for portrait screens.
 * Chosen photos that were deleted since are skipped; a list left empty falls back to one photo
 * per project: wide for desktop, tall for phones.
 */
export async function resolveHomeSlides(content: HomeContent): Promise<HomeSlides> {
  const [rawPlaces, portfolio] = await Promise.all([getPlacesForRender(), getPortfolioGalleryPhotos()]);
  const places = placesWithSortedPhotos(rawPlaces);

  const resolve = (refs: HomeSlideRef[]) =>
    refs.flatMap((ref): HomeSlide[] => {
      if (ref.placeId === PORTFOLIO_SOURCE) {
        const ph = portfolio.find((p) => p.id === ref.photoId);
        return ph ? [{ slug: '', name: '', src: ph.src, width: ph.width, height: ph.height }] : [];
      }
      const place = places.find((p) => p.id === ref.placeId);
      const ph = place?.photos.find((p) => p.id === ref.photoId);
      return place && ph
        ? [{ slug: place.slug, name: place.name, location: place.location, src: ph.src, width: ph.width, height: ph.height }]
        : [];
    });

  const auto = (wide: boolean) =>
    places.flatMap((p) => {
      const ph = p.photos.find((x) => (wide ? x.width > x.height : x.height > x.width)) ?? p.photos[0];
      return ph ? [{ slug: p.slug, name: p.name, location: p.location, src: ph.src, width: ph.width, height: ph.height }] : [];
    });

  const desktop = resolve(content.slides);
  const mobile = resolve(content.mobileSlides);
  return { desktop: desktop.length ? desktop : auto(true), mobile: mobile.length ? mobile : auto(false) };
}
