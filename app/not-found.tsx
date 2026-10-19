import Link from 'next/link';
import Icon from '@/components/Icon';
import { cloudinaryWidth } from '@/lib/cloudinaryImage';
import { getPlacesForRender, placesWithSortedPhotos } from '@/lib/data';
import styles from './not-found.module.css';

export const metadata = { title: 'Not found | Ahmed Emad Photographs' };

/** Unknown project slugs and photo ids land here, with every current project listed. */
export default async function NotFound() {
  const places = placesWithSortedPhotos(await getPlacesForRender());
  return (
    <main className={styles.page}>
      <div>
        <h1 className={styles.title}>Not found</h1>
        <p className={styles.text}>
          This page or project does not exist, or was removed.
          {places.length ? ' These are on the site now:' : ''}
        </p>
        <Link href="/portfolio" className={styles.button}>
          Go to portfolio
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
      {places.length ? (
        <ul className={styles.list}>
          {places.map((p) => {
            const cover = p.photos[0]?.src || p.coverImage;
            return (
              <li key={p.id}>
                <Link href={`/portfolio/${p.slug}`}>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small Cloudinary thumbnail
                    <img src={cloudinaryWidth(cover, 160)} alt="" loading="lazy" />
                  ) : (
                    <span className={styles.noThumb} />
                  )}
                  <span>
                    <b>{p.name}</b>
                    {p.location?.trim() || null}
                  </span>
                  <Icon name="arrow-right" size={16} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
