import styles from './template.module.css';

/** Remounts on every navigation inside the site, so each page arrives with the same short rise. */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}
