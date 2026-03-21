import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.logoContainer}>
            <h1 className={styles.logo}>
              <span className={styles.logoFirst}>AHMED</span>
              <span className={styles.logoBold}>EMAD</span>
            </h1>
            <p className={styles.tagline}>P H O T O G R A P H S</p>
          </div>
          <div className={styles.divider}></div>
          <p className={styles.subtitle}>Architectural Photography</p>
          <Link href="/portfolio" className={styles.ctaButton}>
            <span>View Portfolio</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className={styles.heroOverlay}></div>
        <div className={styles.gridLines}>
          <div className={styles.gridLine}></div>
          <div className={styles.gridLine}></div>
          <div className={styles.gridLine}></div>
          <div className={styles.gridLine}></div>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()}{' '}
          <span className={styles.footerName}>Ahmed Emad</span> Photographs
        </p>
      </footer>
    </main>
  );
}
