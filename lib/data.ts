import fs from 'fs';
import path from 'path';
import { DataStore, Place, Photo } from './types';
import { v4 as uuidv4 } from 'uuid';
import { removePhotoStoredFiles } from './imageCleanup';

const DATA_PATH = path.join(process.cwd(), 'data', 'places.json');

function readData(): DataStore {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { places: [], categories: ['Cultural', 'Residential', 'Hospitality', 'Restaurants', 'Workspaces'] };
  }
}

function writeData(data: DataStore): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getCategories(): string[] {
  return readData().categories;
}

export function getPlaces(): Place[] {
  return readData().places;
}

export function getPlaceById(id: string): Place | undefined {
  return readData().places.find(p => p.id === id);
}

export function getPlaceBySlug(slug: string): Place | undefined {
  return readData().places.find(p => p.slug === slug);
}

export function getPlacesByCategory(category: string): Place[] {
  return readData().places.filter(p => p.category.toLowerCase() === category.toLowerCase());
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function createPlace(
  name: string,
  category: string,
  description: string,
  location = ''
): Place {
  const data = readData();
  const place: Place = {
    id: uuidv4(),
    name,
    slug: slugify(name),
    category,
    location: location.trim() || undefined,
    description,
    coverImage: '',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.places.push(place);
  writeData(data);
  return place;
}

export function updatePlace(
  id: string,
  updates: Partial<Pick<Place, 'name' | 'category' | 'description' | 'location'>>
): Place | null {
  const data = readData();
  const index = data.places.findIndex(p => p.id === id);
  if (index === -1) return null;

  if (updates.name) {
    data.places[index].name = updates.name;
    data.places[index].slug = slugify(updates.name);
  }
  if (updates.category) data.places[index].category = updates.category;
  if (updates.description !== undefined) data.places[index].description = updates.description;
  if (updates.location !== undefined) {
    const trimmed = updates.location.trim();
    data.places[index].location = trimmed ? trimmed : undefined;
  }
  data.places[index].updatedAt = new Date().toISOString();

  writeData(data);
  return data.places[index];
}

export async function deletePlace(id: string): Promise<boolean> {
  const data = readData();
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
  writeData(data);
  return true;
}

export function addPhotosToPlace(placeId: string, photos: Omit<Photo, 'order'>[]): Place | null {
  const data = readData();
  const index = data.places.findIndex(p => p.id === placeId);
  if (index === -1) return null;

  const currentMax = data.places[index].photos.length > 0
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

  writeData(data);
  return data.places[index];
}

export async function deletePhoto(placeId: string, photoId: string): Promise<boolean> {
  const data = readData();
  const placeIndex = data.places.findIndex(p => p.id === placeId);
  if (placeIndex === -1) return false;

  const photoIndex = data.places[placeIndex].photos.findIndex(p => p.id === photoId);
  if (photoIndex === -1) return false;

  const photo = data.places[placeIndex].photos[photoIndex];
  await removePhotoStoredFiles(photo);

  data.places[placeIndex].photos.splice(photoIndex, 1);

  // Update cover if deleted photo was cover
  if (data.places[placeIndex].coverImage === photo.thumbnail) {
    data.places[placeIndex].coverImage = data.places[placeIndex].photos[0]?.thumbnail || '';
  }

  data.places[placeIndex].updatedAt = new Date().toISOString();
  writeData(data);
  return true;
}

export function setCoverImage(placeId: string, photoId: string): boolean {
  const data = readData();
  const placeIndex = data.places.findIndex(p => p.id === placeId);
  if (placeIndex === -1) return false;

  const photo = data.places[placeIndex].photos.find(p => p.id === photoId);
  if (!photo) return false;

  data.places[placeIndex].coverImage = photo.thumbnail;
  data.places[placeIndex].updatedAt = new Date().toISOString();
  writeData(data);
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

/** Reorder projects in storage — first place appears first on the main portfolio grid. */
export function reorderPlaces(orderedIds: string[]): boolean {
  const data = readData();
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
  writeData(data);
  return true;
}

/** Set photo order for a place — lower order / earlier in the list shows first. */
export function reorderPlacePhotos(placeId: string, orderedPhotoIds: string[]): Place | null {
  const data = readData();
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
  writeData(data);
  return data.places[placeIndex];
}
