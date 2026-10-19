import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAuthenticated } from '@/lib/auth';
import { getHomeContent, saveHomeContent } from '@/lib/home';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getHomeContent());
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const updated = await saveHomeContent({ lede: o.lede, slides: o.slides });
  revalidatePath('/');
  return NextResponse.json(updated);
}
