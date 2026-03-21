import Sidebar from '@/components/Sidebar';
import { getPlaces, getCategories, placesWithSortedPhotos } from '@/lib/data';
import styles from './portfolio.module.css';

type Variant = 'gallery' | 'page';

export default function PortfolioShell({
  children,
  variant = 'gallery',
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  const places = placesWithSortedPhotos(getPlaces());
  const categories = getCategories();

  const sidebarPlaces = places.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    location: p.location,
  }));

  const innerClassName =
    variant === 'page'
      ? `${styles.mainInner} ${styles.mainInnerPage}`
      : styles.mainInner;

  return (
    <div className={styles.layout}>
      <Sidebar categories={categories} places={sidebarPlaces} />
      <main className={styles.main}>
        <div className={innerClassName}>{children}</div>
      </main>
    </div>
  );
}
