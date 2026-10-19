import styles from './GallerySkeleton.module.css';

/* Wide tiles where a landscape photo usually falls, so the skeleton reads as the real grid */
const PATTERN = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0];

/**
 * Gallery loading state (app/(site)/portfolio/loading.tsx): the title bar and the two-row grid in
 * flat tone, pulsing left to right. The sidebar stays, so only the gallery waits.
 */
export default function GallerySkeleton() {
  return (
    <div className={styles.wrap} role="status" aria-label="Loading photographs">
      <div className={styles.bar} aria-hidden>
        <span className={styles.title} />
        <span className={styles.seg} />
      </div>
      <div className={styles.stage} aria-hidden>
        <div className={styles.grid}>
          {PATTERN.map((wide, k) => (
            <i key={k} className={wide ? styles.wide : undefined} style={{ '--k': k } as React.CSSProperties} />
          ))}
        </div>
      </div>
    </div>
  );
}
