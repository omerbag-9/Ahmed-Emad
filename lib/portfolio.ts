import type { Photo } from './types';
import { sortPhotosByOrder } from './data';
import { removePhotoStoredFiles } from './imageCleanup';
import { loadPortfolioStore, savePortfolioStore } from './siteDataStore';

interface PortfolioStore {
  photos: Photo[];
}

async function read(): Promise<PortfolioStore> {
  return loadPortfolioStore();
}

async function write(data: PortfolioStore): Promise<void> {
  await savePortfolioStore(data);
}

export async function getPortfolioGalleryPhotos(): Promise<Photo[]> {
  return sortPhotosByOrder((await read()).photos);
}

export async function getPortfolioPhotoById(id: string): Promise<Photo | undefined> {
  return (await read()).photos.find((p) => p.id === id);
}

export async function addPortfolioGalleryPhotos(
  photos: Omit<Photo, 'order'>[]
): Promise<Photo[]> {
  const data = await read();
  const currentMax =
    data.photos.length > 0
      ? Math.max(...data.photos.map((p) => p.order ?? 0))
      : -1;
  const newPhotos = photos.map((photo, i) => ({
    ...photo,
    order: currentMax + 1 + i,
  }));
  data.photos.push(...newPhotos);
  await write(data);
  return getPortfolioGalleryPhotos();
}

export async function deletePortfolioGalleryPhoto(photoId: string): Promise<boolean> {
  const data = await read();
  const index = data.photos.findIndex((p) => p.id === photoId);
  if (index === -1) return false;

  const photo = data.photos[index];
  await removePhotoStoredFiles(photo);

  data.photos.splice(index, 1);
  data.photos = sortPhotosByOrder(data.photos).map((p, i) => ({ ...p, order: i }));
  await write(data);
  return true;
}

export async function reorderPortfolioPhotos(orderedIds: string[]): Promise<boolean> {
  const data = await read();
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
  await write(data);
  return true;
}
