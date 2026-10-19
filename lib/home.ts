import { getPlacesForRender, placesWithSortedPhotos } from './data';
import { getPortfolioGalleryPhotos } from './portfolio';
import { loadHomeStore, saveHomeStore } from './siteDataStore';

/** `placeId` is a project id, or PORTFOLIO_SOURCE for a photo from the main portfolio. */
export type HomeSlideRef = { placeId: string; photoId: string };

export type HomeContent = {
  /** The line under the name */
  lede: string;
  /** Background photos in order. Empty = automatic: one wide photo per project. */
  slides: HomeSlideRef[];
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
};

export async function getHomeContent(): Promise<HomeContent> {
  const stored = await loadHomeStore();
  return {
    lede: typeof stored?.lede === 'string' ? stored.lede : DEFAULT_HOME.lede,
    slides: Array.isArray(stored?.slides) ? stored.slides : [],
  };
}

export async function saveHomeContent(patch: { lede?: unknown; slides?: unknown }): Promise<HomeContent> {
  const next = await getHomeContent();
  if (typeof patch.lede === 'string') next.lede = patch.lede.trim().slice(0, HOME_LEDE_MAX);
  if (Array.isArray(patch.slides)) {
    const seen = new Set<string>();
    next.slides = patch.slides
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
  await saveHomeStore(next);
  return next;
}

/**
 * The photos the home page shows. Chosen photos that were deleted since are skipped; if none are
 * left (or none were ever chosen) it falls back to one wide photo per project.
 */
export async function resolveHomeSlides(content: HomeContent): Promise<HomeSlide[]> {
  const [rawPlaces, portfolio] = await Promise.all([getPlacesForRender(), getPortfolioGalleryPhotos()]);
  const places = placesWithSortedPhotos(rawPlaces);

  const chosen = content.slides.flatMap((ref): HomeSlide[] => {
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
  if (chosen.length) return chosen;

  return places.flatMap((p) => {
    const ph = p.photos.find((x) => x.width > x.height) ?? p.photos[0];
    return ph ? [{ slug: p.slug, name: p.name, location: p.location, src: ph.src, width: ph.width, height: ph.height }] : [];
  });
}
