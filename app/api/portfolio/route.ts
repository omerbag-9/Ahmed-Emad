import { NextResponse } from 'next/server';
import { getPortfolioGalleryPhotos } from '@/lib/portfolio';

export async function GET() {
  const photos = await getPortfolioGalleryPhotos();
  return NextResponse.json({ photos });
}
