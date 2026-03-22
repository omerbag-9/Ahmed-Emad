'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { siteSocialLinks } from '@/lib/site';
import styles from './Sidebar.module.css';

function SocialIcon({ id }: { id: string }) {
  const svgProps = {
    className: styles.socialSvg,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (id) {
    case 'instagram':
      return (
        <svg {...svgProps}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...svgProps}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-12h4v1.5a4 4 0 0 1 3.5-2c1 0 2 .25 2.5.5" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...svgProps}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    default:
      return null;
  }
}

interface Place {
  id: string;
  name: string;
  slug: string;
  category: string;
  location?: string;
}

interface SidebarProps {
  categories: string[];
  places: Place[];
  /** When set with `onMobileOpenChange`, sidebar open state is controlled (e.g. for portfolio FAB position). */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

function placeHref(place: Place) {
  return `/portfolio/${place.category.toLowerCase()}/${place.slug}`;
}

function isActiveProjectPath(pathname: string, place: Place) {
  return pathname === placeHref(place);
}

export default function Sidebar({
  categories: _categories,
  places,
  mobileOpen: mobileOpenProp,
  onMobileOpenChange,
}: SidebarProps) {
  const pathname = usePathname();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = typeof onMobileOpenChange === 'function';
  const mobileOpen = controlled ? Boolean(mobileOpenProp) : uncontrolledOpen;
  const setMobileOpen = (open: boolean) => {
    if (controlled) onMobileOpenChange(open);
    else setUncontrolledOpen(open);
  };
  const onAnyProject = places.some((p) => isActiveProjectPath(pathname, p));
  const [projectsOpen, setProjectsOpen] = useState(onAnyProject);

  useEffect(() => {
    if (onAnyProject) setProjectsOpen(true);
  }, [onAnyProject]);

  return (
    <>
      <div className={styles.mobileHeader}>
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <span className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        <Link href="/" className={styles.mobileHeaderBrand} onClick={() => setMobileOpen(false)}>
          <span className={styles.mobileHeaderBrandName}>
            <span className={styles.brandFirst}>AHMED</span>{' '}
            <span className={styles.brandBold}>EMAD</span>
          </span>
          <span className={styles.mobileHeaderBrandTag}>P H O T O G R A P H S</span>
        </Link>
      </div>

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarInner}>
          <div className={styles.sidebarTop}>
            <Link href="/" className={styles.brand}>
              <h2 className={styles.brandName}>
                <span className={styles.brandFirst}>AHMED</span>{' '}
                <span className={styles.brandBold}>EMAD</span>
              </h2>
              <p className={styles.brandTag}>P H O T O G R A P H S</p>
            </Link>

            <nav className={styles.nav}>
              <Link
                href="/portfolio"
                className={`${styles.navLink} ${styles.portfolioLink} ${pathname === '/portfolio' ? styles.active : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Portfolio
              </Link>
              <Link
                href="/about"
                className={`${styles.navLink} ${styles.pageLink} ${pathname === '/about' ? styles.active : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className={`${styles.navLink} ${styles.pageLink} ${pathname === '/contact' ? styles.active : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Contact
              </Link>

              {places.length > 0 ? (
                <div className={styles.projectsBlock}>
                  <button
                    type="button"
                    className={`${styles.projectsToggle} ${onAnyProject ? styles.projectsToggleActive : ''}`}
                    aria-expanded={projectsOpen}
                    aria-controls={projectsOpen ? 'sidebar-projects-list' : undefined}
                    id="sidebar-projects-label"
                    onClick={() => setProjectsOpen((o) => !o)}
                  >
                    <span className={styles.projectsToggleLabel}>Projects</span>
                    <svg
                      className={`${styles.projectsChevron} ${projectsOpen ? styles.projectsChevronOpen : ''}`}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {projectsOpen ? (
                    <div
                      id="sidebar-projects-list"
                      role="region"
                      aria-labelledby="sidebar-projects-label"
                      className={styles.projectsPanel}
                    >
                    {places.map((place, idx) => {
                      const loc = place.location?.trim();
                      const href = placeHref(place);
                      const active = isActiveProjectPath(pathname, place);
                      return (
                        <Link
                          key={place.id}
                          href={href}
                          className={`${styles.navLink} ${styles.placeLink} ${styles.placeLinkNested} ${active ? styles.active : ''}`}
                          onClick={() => setMobileOpen(false)}
                          style={{ animationDelay: `${idx * 0.04}s` }}
                        >
                          <span className={styles.placeLinkRow}>
                            <span className={styles.placeLinkName}>{place.name}</span>
                            {loc ? (
                              <span className={styles.placeLinkLocation}>{loc}</span>
                            ) : null}
                          </span>
                        </Link>
                      );
                    })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </nav>
          </div>

          {siteSocialLinks.filter((s) => s.href?.trim()).length > 0 ? (
            <div className={styles.socialFooter}>
              <div className={styles.socialRow}>
                {siteSocialLinks
                  .filter((s) => s.href?.trim())
                  .map((s) => (
                    <a
                      key={s.id}
                      href={s.href}
                      className={styles.socialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      onClick={() => setMobileOpen(false)}
                    >
                      <SocialIcon id={s.id} />
                    </a>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
