import fs from 'fs';
import path from 'path';
import type { Photo } from './types';
import { sortPhotosByOrder } from './data';
import { removePhotoStoredFiles } from './imageCleanup';

const PORTFOLIO_PATH = path.join(process.cwd(), 'data', 'portfolio.json');

interface PortfolioStore {
  photos: Photo[];
}

function read(): PortfolioStore {
  try {
    const raw = fs.readFileSync(PORTFOLIO_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { photos?: Photo[] };
    return { photos: Array.isArray(parsed.photos) ? parsed.photos : [] };
  } catch {
    return { photos: [] };
  }
}

function write(data: PortfolioStore): void {
  const dir = path.dirname(PORTFOLIO_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getPortfolioGalleryPhotos(): Photo[] {
  return sortPhotosByOrder(read().photos);
}

export function getPortfolioPhotoById(id: string): Photo | undefined {
  return read().photos.find((p) => p.id === id);
}

export function addPortfolioGalleryPhotos(photos: Omit<Photo, 'order'>[]): Photo[] {
  const data = read();
  const currentMax =
    data.photos.length > 0
      ? Math.max(...data.photos.map((p) => p.order ?? 0))
      : -1;
  const newPhotos = photos.map((photo, i) => ({
    ...photo,
    order: currentMax + 1 + i,
  }));
  data.photos.push(...newPhotos);
  write(data);
  return getPortfolioGalleryPhotos();
}

export async function deletePortfolioGalleryPhoto(photoId: string): Promise<boolean> {
  const data = read();
  const index = data.photos.findIndex((p) => p.id === photoId);
  if (index === -1) return false;

  const photo = data.photos[index];
  await removePhotoStoredFiles(photo);

  data.photos.splice(index, 1);
  data.photos = sortPhotosByOrder(data.photos).map((p, i) => ({ ...p, order: i }));
  write(data);
  return true;
}

export function reorderPortfolioPhotos(orderedIds: string[]): boolean {
  const data = read();
  if (orderedIds.length !== data.photos.length) return false;
  const seen = new Set<string>();
  for (const id of orderedIds) {
    if (seen.has(id)) return false;
    seen.add(id);
  }
  const ids = new Set(data.photos.map((p) => p.id));
  for (const id of orderedIds) {
    if (!ids.has(id)) return false;
  }
  const byId = new Map(data.photos.map((p) => [p.id, p]));
  data.photos = orderedIds.map((id, i) => {
    const ph = byId.get(id)!;
    return { ...ph, order: i };
  });
  write(data);
  return true;
}
