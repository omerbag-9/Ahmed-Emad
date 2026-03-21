import { NextResponse } from 'next/server';
import { getPortfolioGalleryPhotos } from '@/lib/portfolio';

export async function GET() {
  const photos = getPortfolioGalleryPhotos();
  return NextResponse.json({ photos });
}
