import fs from 'fs';
import path from 'path';
import { DataStore, Place, Photo } from './types';
import { v4 as uuidv4 } from 'uuid';
import { removePhotoStoredFiles } from './imageCleanup';
import { loadPlacesStore, savePlacesStore } from './siteDataStore';

async function readData(): Promise<DataStore> {
  return loadPlacesStore();
}

async function writeData(data: DataStore): Promise<void> {
  await savePlacesStore(data);
}

export async function getPlaces(): Promise<Place[]> {
  return (await readData()).places;
}

export async function getPlaceById(id: string): Promise<Place | undefined> {
  return (await readData()).places.find(p => p.id === id);
}

export async function getPlaceBySlug(slug: string): Promise<Place | undefined> {
  return (await readData()).places.find(p => p.slug === slug);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createPlace(
  name: string,
  description: string,
  location = '',
  brief = ''
): Promise<Place> {
  const data = await readData();
  const place: Place = {
    id: uuidv4(),
    name,
    slug: slugify(name),
    location: location.trim() || undefined,
    brief,
    description,
    coverImage: '',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.places.push(place);
  await writeData(data);
  return place;
}

export async function updatePlace(
  id: string,
  updates: Partial<Pick<Place, 'name' | 'brief' | 'description' | 'location'>>
): Promise<Place | null> {
  const data = await readData();
  const index = data.places.findIndex(p => p.id === id);
  if (index === -1) return null;

  if (updates.name) {
    data.places[index].name = updates.name;
    data.places[index].slug = slugify(updates.name);
  }
  if (updates.brief !== undefined) data.places[index].brief = updates.brief;
  if (updates.description !== undefined) data.places[index].description = updates.description;
  if (updates.location !== undefined) {
    const trimmed = updates.location.trim();
    data.places[index].location = trimmed ? trimmed : undefined;
  }
  data.places[index].updatedAt = new Date().toISOString();

  await writeData(data);
  return data.places[index];
}

export async function deletePlace(id: string): Promise<boolean> {
  const data = await readData();
  const index = data.places.findIndex(p => p.id === id);
  if (index === -1) return false;

  const place = data.places[index];
  for (const photo of place.photos) {
    await removePhotoStoredFiles(photo);
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'places', place.slug);
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true });
  }

  data.places.splice(index, 1);
  await writeData(data);
  return true;
}

export async function addPhotosToPlace(
  placeId: string,
  photos: Omit<Photo, 'order'>[]
): Promise<Place | null> {
  const data = await readData();
  const index = data.places.findIndex(p => p.id === placeId);
  if (index === -1) return null;

  const currentMax =
    data.places[index].photos.length > 0
      ? Math.max(...data.places[index].photos.map(p => p.order))
      : -1;

  const newPhotos = photos.map((photo, i) => ({
    ...photo,
    order: currentMax + 1 + i,
  }));

  data.places[index].photos.push(...newPhotos);
  if (!data.places[index].coverImage && newPhotos.length > 0) {
    data.places[index].coverImage = newPhotos[0].thumbnail;
  }
  data.places[index].updatedAt = new Date().toISOString();

  await writeData(data);
  return data.places[index];
}

export async function deletePhoto(placeId: string, photoId: string): Promise<boolean> {
  const data = await readData();
  const placeIndex = data.places.findIndex(p => p.id === placeId);
  if (placeIndex === -1) return false;

  const photoIndex = data.places[placeIndex].photos.findIndex(p => p.id === photoId);
  if (photoIndex === -1) return false;

  const photo = data.places[placeIndex].photos[photoIndex];
  await removePhotoStoredFiles(photo);

  data.places[placeIndex].photos.splice(photoIndex, 1);

  if (data.places[placeIndex].coverImage === photo.thumbnail) {
    data.places[placeIndex].coverImage = data.places[placeIndex].photos[0]?.thumbnail || '';
  }

  data.places[placeIndex].updatedAt = new Date().toISOString();
  await writeData(data);
  return true;
}

export async function setCoverImage(placeId: string, photoId: string): Promise<boolean> {
  const data = await readData();
  const placeIndex = data.places.findIndex(p => p.id === placeId);
  if (placeIndex === -1) return false;

  const photo = data.places[placeIndex].photos.find(p => p.id === photoId);
  if (!photo) return false;

  data.places[placeIndex].coverImage = photo.thumbnail;
  data.places[placeIndex].updatedAt = new Date().toISOString();
  await writeData(data);
  return true;
}

export function sortPhotosByOrder(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function placesWithSortedPhotos(places: Place[]): Place[] {
  return places.map((p) => ({
    ...p,
    photos: sortPhotosByOrder(p.photos),
  }));
}

export async function reorderPlaces(orderedIds: string[]): Promise<boolean> {
  const data = await readData();
  if (orderedIds.length !== data.places.length) return false;
  const seen = new Set<string>();
  for (const id of orderedIds) {
    if (seen.has(id)) return false;
    seen.add(id);
  }
  const placeIds = new Set(data.places.map((p) => p.id));
  for (const id of orderedIds) {
    if (!placeIds.has(id)) return false;
  }
  const byId = new Map(data.places.map((p) => [p.id, p]));
  data.places = orderedIds.map((id) => byId.get(id)!);
  await writeData(data);
  return true;
}

export async function reorderPlacePhotos(
  placeId: string,
  orderedPhotoIds: string[]
): Promise<Place | null> {
  const data = await readData();
  const placeIndex = data.places.findIndex((p) => p.id === placeId);
  if (placeIndex === -1) return null;

  const place = data.places[placeIndex];
  const currentIds = new Set(place.photos.map((p) => p.id));
  if (orderedPhotoIds.length !== currentIds.size) return null;
  for (const id of orderedPhotoIds) {
    if (!currentIds.has(id)) return null;
  }

  const byId = new Map(place.photos.map((p) => [p.id, p]));
  const newPhotos = orderedPhotoIds.map((id, i) => {
    const ph = byId.get(id)!;
    return { ...ph, order: i };
  });

  data.places[placeIndex].photos = newPhotos;
  data.places[placeIndex].updatedAt = new Date().toISOString();
  await writeData(data);
  return data.places[placeIndex];
}
