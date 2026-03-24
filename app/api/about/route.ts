import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getAboutContent, patchAboutContent } from '@/lib/about';

export async function GET() {
  return NextResponse.json(getAboutContent());
}

export async function PATCH(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
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
  const patch: Parameters<typeof patchAboutContent>[0] = {};

  if (o.clearImage === true) patch.clearImage = true;

  for (const key of [
    'eyebrow',
    'title',
    'lead',
    'body',
    'bodyExtra',
    'imageSrc',
    'imageAlt',
  ] as const) {
    if (typeof o[key] === 'string') {
      patch[key] = o[key];
    }
  }

  const updated = await patchAboutContent(patch);
  return NextResponse.json(updated);
}
