import { getHomeContent, resolveHomeSlides } from '@/lib/home';
import HomeHero from './HomeHero';

/* The photos and the line under the name are edited in the admin */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const content = await getHomeContent();
  const { desktop, mobile } = await resolveHomeSlides(content);
  return <HomeHero desktop={desktop} mobile={mobile} lede={content.lede} />;
}
