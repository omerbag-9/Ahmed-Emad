import styles from './PageLoader.module.css';

type Props = {
  /** Short line under the name. */
  caption?: string;
};

const WORD = 'AHMED EMAD';

/**
 * Route loader (app/loading.tsx). One signal: the name inks in letter by letter, like a print
 * developing, with a thin bar at the top of the screen. Hidden for the first 150ms so fast
 * navigations never flash it.
 */
export default function PageLoader({ caption = 'Loading' }: Props) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite" aria-label={caption}>
      <span className={styles.bar} aria-hidden />
      <div className={styles.inner} aria-hidden>
        <p className={styles.word}>
          {WORD.split('').map((c, i) =>
            c === ' ' ? (
              <span key={i} className={styles.space} />
            ) : (
              <span key={i} style={{ '--k': i } as React.CSSProperties}>
                {c}
              </span>
            )
          )}
        </p>
        <p className={styles.caption}>{caption}</p>
      </div>
    </div>
  );
}
