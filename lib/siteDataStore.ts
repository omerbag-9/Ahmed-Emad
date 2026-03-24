import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';
import type { DataStore, Photo } from './types';
import type { AboutContent } from './about';

const PLACES_PATH = path.join(process.cwd(), 'data', 'places.json');
const PORTFOLIO_PATH = path.join(process.cwd(), 'data', 'portfolio.json');
const ABOUT_PATH = path.join(process.cwd(), 'data', 'about.json');

const K_PLACES = 'ae:v1:places';
const K_PORTFOLIO = 'ae:v1:portfolio';
const K_ABOUT = 'ae:v1:about';

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/** When true, site JSON is read/written via Redis (required for admin mutations on Vercel). */
export function usesRemoteSiteData(): boolean {
  return getRedis() !== null;
}

const defaultPlaces = (): DataStore => ({
  places: [],
  categories: ['Cultural', 'Residential', 'Hospitality', 'Restaurants', 'Workspaces'],
});

function readPlacesFromDisk(): DataStore {
  try {
    const raw = fs.readFileSync(PLACES_PATH, 'utf-8');
    return JSON.parse(raw) as DataStore;
  } catch {
    return defaultPlaces();
  }
}

export async function loadPlacesStore(): Promise<DataStore> {
  const r = getRedis();
  if (!r) return readPlacesFromDisk();

  const data = await r.get<DataStore>(K_PLACES);
  if (data && typeof data === 'object' && Array.isArray((data as DataStore).places)) {
    return data as DataStore;
  }

  const seeded = readPlacesFromDisk();
  await r.set(K_PLACES, seeded);
  return seeded;
}

export async function savePlacesStore(data: DataStore): Promise<void> {
  const r = getRedis();
  if (!r) {
    fs.writeFileSync(PLACES_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return;
  }
  await r.set(K_PLACES, data);
}

interface PortfolioStore {
  photos: Photo[];
}

function readPortfolioFromDisk(): PortfolioStore {
  try {
    const raw = fs.readFileSync(PORTFOLIO_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { photos?: Photo[] };
    return { photos: Array.isArray(parsed.photos) ? parsed.photos : [] };
  } catch {
    return { photos: [] };
  }
}

export async function loadPortfolioStore(): Promise<PortfolioStore> {
  const r = getRedis();
  if (!r) return readPortfolioFromDisk();

  const data = await r.get<PortfolioStore>(K_PORTFOLIO);
  if (data && typeof data === 'object' && Array.isArray(data.photos)) {
    return data;
  }

  const seeded = readPortfolioFromDisk();
  await r.set(K_PORTFOLIO, seeded);
  return seeded;
}

export async function savePortfolioStore(data: PortfolioStore): Promise<void> {
  const r = getRedis();
  if (!r) {
    const dir = path.dirname(PORTFOLIO_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return;
  }
  await r.set(K_PORTFOLIO, data);
}

const defaultAbout = (): AboutContent => ({
  eyebrow: 'The studio',
  title: 'About',
  lead: '',
  body: '',
  bodyExtra: '',
  imageSrc: '',
  imageAlt: '',
});

function readAboutFromDisk(): AboutContent {
  try {
    const raw = fs.readFileSync(ABOUT_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AboutContent>;
    const d = defaultAbout();
    return {
      ...d,
      eyebrow: typeof parsed.eyebrow === 'string' ? parsed.eyebrow : d.eyebrow,
      title: typeof parsed.title === 'string' ? parsed.title : d.title,
      lead: typeof parsed.lead === 'string' ? parsed.lead : d.lead,
      body: typeof parsed.body === 'string' ? parsed.body : d.body,
      bodyExtra:
        typeof parsed.bodyExtra === 'string' ? parsed.bodyExtra : d.bodyExtra,
      imageSrc: typeof parsed.imageSrc === 'string' ? parsed.imageSrc : d.imageSrc,
      imageAlt: typeof parsed.imageAlt === 'string' ? parsed.imageAlt : d.imageAlt,
      imageCloudinaryPublicId:
        typeof parsed.imageCloudinaryPublicId === 'string'
          ? parsed.imageCloudinaryPublicId
          : undefined,
    };
  } catch {
    return defaultAbout();
  }
}

export async function loadAboutStore(): Promise<AboutContent> {
  const r = getRedis();
  if (!r) return readAboutFromDisk();

  const data = await r.get<AboutContent>(K_ABOUT);
  if (data && typeof data === 'object' && typeof (data as AboutContent).title === 'string') {
    return { ...defaultAbout(), ...data };
  }

  const seeded = readAboutFromDisk();
  await r.set(K_ABOUT, seeded);
  return seeded;
}

export async function saveAboutStore(data: AboutContent): Promise<void> {
  const r = getRedis();
  if (!r) {
    const dir = path.dirname(ABOUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ABOUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return;
  }
  await r.set(K_ABOUT, data);
}
