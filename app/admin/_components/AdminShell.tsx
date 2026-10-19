'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Icon, { type IconName } from '@/components/Icon';
import styles from './admin.module.css';

export type ShellProject = { id: string; name: string; photoCount: number; cover: string };

export default function AdminShell({
  projects,
  portfolioCount,
  children,
}: {
  projects: ShellProject[];
  portfolioCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const item = (href: string, label: string, icon: IconName, count?: number) => (
    <Link href={href} className={styles.navItem} aria-current={pathname === href ? 'page' : undefined}>
      <Icon name={icon} size={16} />
      <span className={styles.navName}>{label}</span>
      {count !== undefined ? <span className={styles.navCount}>{count}</span> : null}
    </Link>
  );

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Admin">
        <div className={styles.brand}>
          <Link href="/admin" className={styles.brandName} aria-label="Admin overview">
            <span>AHMED</span>
            <span>EMAD</span>
          </Link>
          <span className={styles.brandKind}>Admin</span>
        </div>
        <nav className={styles.nav} aria-label="Admin sections">
          {item('/admin', 'Overview', 'grid')}
          {item('/admin/home', 'Home page', 'home')}
          {item('/admin/portfolio', 'Main portfolio', 'photo', portfolioCount)}
          {item('/admin/about', 'About page', 'user')}
          <p className={styles.navGroup}>Projects</p>
          {projects.map((p) => {
            const href = `/admin/places/${p.id}/edit`;
            return (
              <Link
                key={p.id}
                href={href}
                className={`${styles.navItem} ${styles.navProject}`}
                aria-current={pathname === href ? 'page' : undefined}
              >
                {p.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail
                  <img className={styles.navThumb} src={p.cover} alt="" />
                ) : (
                  <span className={styles.navThumb} />
                )}
                <span className={styles.navName}>{p.name}</span>
                <span className={styles.navCount}>{p.photoCount}</span>
              </Link>
            );
          })}
          {item('/admin/places/new', 'New project', 'plus')}
        </nav>
        <div className={`${styles.nav} ${styles.navFoot}`}>
          <Link href="/portfolio" className={styles.navItem}>
            <Icon name="external" size={16} />
            View site
          </Link>
          <button type="button" className={styles.navItem} onClick={signOut} disabled={signingOut}>
            <Icon name="logout" size={16} />
            {signingOut ? 'Signing out' : 'Sign out'}
          </button>
        </div>
      </aside>
      <main className={styles.main} key={pathname}>
        {children}
      </main>
    </div>
  );
}
