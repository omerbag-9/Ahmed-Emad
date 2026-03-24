import fs from 'fs';
import path from 'path';
import { destroyPublicIds } from './cloudinary';
import { loadAboutStore, saveAboutStore } from './siteDataStore';

export type AboutContent = {
  eyebrow: string;
  title: string;
  lead: string;
  body: string;
  bodyExtra: string;
  imageSrc: string;
  imageAlt: string;
  /** Cloudinary public_id for the about portrait — used when replacing or clearing */
  imageCloudinaryPublicId?: string;
};

export const DEFAULT_ABOUT: AboutContent = {
  eyebrow: 'The studio',
  title: 'About',
  lead: '',
  body: '',
  bodyExtra: '',
  imageSrc: '',
  imageAlt: '',
};

export async function getAboutContent(): Promise<AboutContent> {
  return loadAboutStore();
}

export async function saveAboutContent(data: AboutContent): Promise<void> {
  await saveAboutStore(data);
}

/** Only delete files under /uploads/about/ */
export function deleteAboutImageFile(imageSrc: string): void {
  if (!imageSrc || !imageSrc.startsWith('/uploads/about/')) return;
  const rel = imageSrc.replace(/^\//, '');
  const full = path.join(process.cwd(), 'public', rel);
  if (fs.existsSync(full)) {
    fs.unlinkSync(full);
  }
}

async function removeStoredAboutImage(content: AboutContent): Promise<void> {
  if (content.imageCloudinaryPublicId) {
    await destroyPublicIds([content.imageCloudinaryPublicId]);
  }
  if (content.imageSrc?.startsWith('/uploads/about/')) {
    deleteAboutImageFile(content.imageSrc);
  }
}

const LIMITS = {
  eyebrow: 160,
  title: 200,
  lead: 4000,
  body: 8000,
  bodyExtra: 8000,
  imageAlt: 240,
} as const;

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

export type AboutPatch = Partial<
  Pick<
    AboutContent,
    | 'eyebrow'
    | 'title'
    | 'lead'
    | 'body'
    | 'bodyExtra'
    | 'imageSrc'
    | 'imageAlt'
    | 'imageCloudinaryPublicId'
  >
> & { clearImage?: boolean };

function isAllowedImageSrc(src: string): boolean {
  return (
    src.startsWith('/uploads/about/') || src.startsWith('https://res.cloudinary.com/')
  );
}

export async function patchAboutContent(patch: AboutPatch): Promise<AboutContent> {
  const current = await loadAboutStore();
  const next: AboutContent = { ...current };

  if (patch.clearImage === true) {
    await removeStoredAboutImage(current);
    next.imageSrc = '';
    delete next.imageCloudinaryPublicId;
  }

  if (typeof patch.eyebrow === 'string') {
    next.eyebrow = clip(patch.eyebrow.trim(), LIMITS.eyebrow);
  }
  if (typeof patch.title === 'string') {
    next.title = clip(patch.title.trim(), LIMITS.title);
  }
  if (typeof patch.lead === 'string') {
    next.lead = clip(patch.lead.trim(), LIMITS.lead);
  }
  if (typeof patch.body === 'string') {
    next.body = clip(patch.body.trim(), LIMITS.body);
  }
  if (typeof patch.bodyExtra === 'string') {
    next.bodyExtra = clip(patch.bodyExtra.trim(), LIMITS.bodyExtra);
  }
  if (typeof patch.imageAlt === 'string') {
    next.imageAlt = clip(patch.imageAlt.trim(), LIMITS.imageAlt);
  }
  if (typeof patch.imageSrc === 'string') {
    const src = patch.imageSrc.trim();
    if (src === '') {
      await removeStoredAboutImage(next);
      next.imageSrc = '';
      delete next.imageCloudinaryPublicId;
    } else if (isAllowedImageSrc(src)) {
      if (next.imageSrc && next.imageSrc !== src) {
        await removeStoredAboutImage(next);
      }
      next.imageSrc = src;
      if (src.startsWith('https://res.cloudinary.com/')) {
        if (typeof patch.imageCloudinaryPublicId === 'string' && patch.imageCloudinaryPublicId) {
          next.imageCloudinaryPublicId = patch.imageCloudinaryPublicId;
        }
      } else {
        delete next.imageCloudinaryPublicId;
      }
    }
  }

  await saveAboutStore(next);
  return next;
}
