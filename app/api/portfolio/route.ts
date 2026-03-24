import { NextResponse } from 'next/server';
import { getPortfolioGalleryPhotos } from '@/lib/portfolio';

export const dynamic = 'force-dynamic';

export async function GET() {
  const photos = await getPortfolioGalleryPhotos();
  return NextResponse.json({ photos });
}
