export function shouldUnoptimizeNextImage(src: string): boolean {
  const s = (src || '').trim();
  return s.startsWith('https://res.cloudinary.com/');
}

