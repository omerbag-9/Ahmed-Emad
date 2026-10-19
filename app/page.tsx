import { getHomeContent, resolveHomeSlides } from '@/lib/home';
import HomeHero from './HomeHero';

/* The photos and the line under the name are edited in the admin */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const content = await getHomeContent();
  const slides = await resolveHomeSlides(content);
  return <HomeHero slides={slides} lede={content.lede} />;
}
