import { Redis } from '@upstash/redis';
import { createClient } from 'redis';
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

/** Unified read/write: Upstash REST or TCP via REDIS_URL (Vercel Marketplace Redis). */
interface StoreRedis {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

/** One TCP client per server instance (Vercel isolates instances). */
let tcpSingleton: ReturnType<typeof createClient> | undefined;

async function getTcpClient(url: string): Promise<ReturnType<typeof createClient>> {
  if (!tcpSingleton) {
    const client = createClient({ url });
    client.on('error', (err) => console.error('Redis (REDIS_URL) error:', err));
    await client.connect();
    tcpSingleton = client;
  }
  return tcpSingleton;
}

async function createStoreRedis(): Promise<StoreRedis | null> {
  const restUrl =
    process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const restToken =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();

  if (restUrl && restToken) {
    const r = new Redis({ url: restUrl, token: restToken });
    return {
      get: <T>(key: string) => r.get<T>(key),
      set: async (key: string, value: unknown) => {
        await r.set(key, value as never);
      },
    };
  }

  const tcpUrl =
    process.env.REDIS_URL?.trim() ||
    process.env.redis_url?.trim() ||
    process.env.KV_URL?.trim();

  if (tcpUrl) {
    const tcp = await getTcpClient(tcpUrl);
    return {
      get: async <T>(key: string): Promise<T | null> => {
        const raw = await tcp.get(key);
        if (raw == null) return null;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return null;
        }
      },
      set: async (key: string, value: unknown) => {
        await tcp.set(key, JSON.stringify(value));
      },
    };
  }

  return null;
}

let storePromise: Promise<StoreRedis | null> | null = null;

async function getStoreRedis(): Promise<StoreRedis | null> {
  if (storePromise === null) {
    storePromise = createStoreRedis().catch((e) => {
      console.error('Redis init failed:', e);
      storePromise = null;
      return null;
    });
  }
  return storePromise;
}

function trimEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : undefined;
}

/** When true, site JSON is read/written via Redis (required for admin mutations on Vercel). */
export function usesRemoteSiteData(): boolean {
  const hasRest =
    !!(trimEnv('UPSTASH_REDIS_REST_URL') && trimEnv('UPSTASH_REDIS_REST_TOKEN')) ||
    !!(trimEnv('KV_REST_API_URL') && trimEnv('KV_REST_API_TOKEN'));
  const hasTcp = !!(
    trimEnv('REDIS_URL') ||
    (typeof process.env.redis_url === 'string' && process.env.redis_url.trim()) ||
    trimEnv('KV_URL')
  );
  return hasRest || hasTcp;
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
  const r = await getStoreRedis();
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
  const r = await getStoreRedis();
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
  const r = await getStoreRedis();
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
  const r = await getStoreRedis();
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
  const r = await getStoreRedis();
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
  const r = await getStoreRedis();
  if (!r) {
    const dir = path.dirname(ABOUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ABOUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return;
  }
  await r.set(K_ABOUT, data);
}
