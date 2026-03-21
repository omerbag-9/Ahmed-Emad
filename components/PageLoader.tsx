import styles from './PageLoader.module.css';

type Props = {
  /** Fills viewport with site background (e.g. route transitions). */
  fullPage?: boolean;
  /** Short line under the monogram; keep uppercase-friendly. */
  caption?: string;
};

export default function PageLoader({ fullPage = false, caption = 'Loading' }: Props) {
  return (
    <div
      className={`${styles.wrap} ${fullPage ? styles.fullPage : styles.embedded}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={caption}
    >
      <div className={styles.inner}>
        <p className={styles.monogram}>AHMED EMAD</p>
        <div className={styles.track} aria-hidden>
          <div className={styles.bar} />
        </div>
        <div className={styles.dots} aria-hidden>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        <p className={styles.caption}>{caption}</p>
      </div>
    </div>
  );
}
