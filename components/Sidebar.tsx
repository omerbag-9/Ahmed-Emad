'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon, { type IconName } from '@/components/Icon';
import Magnet from '@/components/motion/Magnet';
import { cloudinaryWidth } from '@/lib/cloudinaryImage';
import { copyText, spark, toast } from '@/lib/feedback';
import { siteContact, siteCopyrightOwner, siteSocialLinks } from '@/lib/site';
import styles from './Sidebar.module.css';

interface Place {
  id: string;
  name: string;
  slug: string;
  location?: string;
  photoCount: number;
  cover: string;
}

interface SidebarProps {
  places: Place[];
  portfolioCount: number;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  /** Desktop: collapsed to a narrow rail */
  rail: boolean;
  onRailChange: (rail: boolean) => void;
}

const placeHref = (place: Place) => `/portfolio/${place.slug}`;
const socialIcon = (id: string): IconName | null =>
  id === 'instagram' || id === 'linkedin' || id === 'facebook' ? id : null;

function Lockup({ mobile = false }: { mobile?: boolean }) {
  return (
    <span className={`${styles.lockup} ${mobile ? styles.lockupMobile : ''}`}>
      <span className={styles.lockupName}>
        <span className={styles.lockupFirst}>AHMED</span>
        <span>EMAD</span>
      </span>
      <span className={styles.lockupTag}>PHOTOGRAPHS</span>
    </span>
  );
}

export default function Sidebar({
  places,
  portfolioCount,
  mobileOpen,
  onMobileOpenChange,
  rail,
  onRailChange,
}: SidebarProps) {
  const pathname = usePathname();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<{ place: Place; top: number } | null>(null);

  const activePlace = places.find((p) => pathname === placeHref(p));
  const close = () => onMobileOpenChange(false);

  /* Opening a project always shows the list it lives in */
  useEffect(() => {
    if (activePlace) queueMicrotask(() => setProjectsOpen(true));
  }, [activePlace]);

  /*
   * Sliding marker behind the current page or project. When the active project is inside the
   * collapsed list, the marker sits on the "Projects" toggle instead.
   */
  const placeMarker = useCallback(() => {
    const hl = hlRef.current;
    const box = scrollRef.current;
    if (!hl || !box) return;
    let cur = box.querySelector<HTMLElement>('[aria-current="page"]');
    if (cur && activePlace && !projectsOpen) cur = toggleRef.current;
    if (!cur || cur.getClientRects().length === 0) {
      hl.dataset.on = 'false';
      return;
    }
    const br = box.getBoundingClientRect();
    const r = cur.getBoundingClientRect();
    hl.style.height = `${r.height}px`;
    hl.style.transform = `translateY(${r.top - br.top + box.scrollTop}px)`;
    hl.dataset.on = 'true';
  }, [activePlace, projectsOpen]);

  useLayoutEffect(() => {
    placeMarker();
    /* Opening the list: wait for its rows to have height before measuring again */
    const t = setTimeout(placeMarker, 400);
    return () => clearTimeout(t);
  }, [placeMarker, pathname, rail]);

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => placeMarker());
    ro.observe(box);
    return () => ro.disconnect();
  }, [placeMarker]);

  /* `[` toggles the rail on desktop */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '[' || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return;
      if (matchMedia('(max-width: 900px)').matches) return;
      onRailChange(!rail);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [rail, onRailChange]);

  /* Phone drawer: Esc closes it and the page behind does not scroll */
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onMobileOpenChange(false);
    addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, onMobileOpenChange]);

  /* Warm the project covers so the hover preview never opens empty */
  useEffect(() => {
    places.forEach((p) => {
      if (!p.cover) return;
      const img = new Image();
      img.src = cloudinaryWidth(p.cover, 480);
    });
  }, [places]);

  const showPreview = (place: Place, el: HTMLElement) => {
    if (!place.cover || matchMedia('(hover: none), (max-width: 900px)').matches) return;
    const r = el.getBoundingClientRect();
    setPreview({ place, top: Math.min(Math.max(16, r.top - 40), innerHeight - 340) });
  };

  const copyEmail = async (e: React.MouseEvent) => {
    await copyText(siteContact.email);
    spark(e.clientX, e.clientY);
    toast('Email copied');
  };

  const socials = siteSocialLinks.filter((s) => s.href?.trim() && socialIcon(s.id));
  const navLink = (href: string, label: string, k: number, count?: number) => (
    <Link
      href={href}
      className={styles.navLink}
      aria-current={pathname === href ? 'page' : undefined}
      onClick={close}
      style={{ '--k': k } as React.CSSProperties}
    >
      <span className={styles.navLabel}>{label}</span>
      {count !== undefined ? <span className={styles.count}>{count}</span> : null}
    </Link>
  );

  return (
    <>
      <div className={styles.mobileHeader} style={{ viewTransitionName: 'ae-mobilebar' }}>
        <button
          type="button"
          className={`${styles.burger} ${mobileOpen ? styles.burgerOpen : ''}`}
          onClick={() => onMobileOpenChange(!mobileOpen)}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          aria-controls="site-sidebar"
        >
          <span />
          <span />
          <span />
        </button>
        <Link href="/" className={styles.mobileBrand} onClick={close} aria-label="Ahmed Emad Photographs, home">
          <Lockup mobile />
        </Link>
      </div>

      <aside
        id="site-sidebar"
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''} ${rail ? styles.sidebarRail : ''}`}
        aria-label="Site"
        style={{ viewTransitionName: 'ae-sidebar' }}
      >
        <div className={styles.inner}>
          <div className={styles.top}>
            <Link href="/" className={styles.brand} aria-label="Ahmed Emad Photographs, home">
              <Lockup />
            </Link>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => onRailChange(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar  ["
            >
              <Icon name="panel-close" />
            </button>
          </div>

          <div className={styles.scroll} ref={scrollRef}>
            <span className={styles.marker} ref={hlRef} data-on="false" aria-hidden />
            <nav className={styles.nav} aria-label="Main">
              {navLink('/portfolio', 'Portfolio', 0, portfolioCount)}
              {navLink('/about', 'About', 1)}
              {navLink('/contact', 'Contact', 2)}
            </nav>

            {places.length > 0 ? (
              <div className={styles.group} style={{ '--k': 3 } as React.CSSProperties}>
                <button
                  type="button"
                  ref={toggleRef}
                  className={styles.groupToggle}
                  aria-expanded={projectsOpen}
                  aria-controls="sidebar-projects"
                  onClick={() => setProjectsOpen((o) => !o)}
                >
                  <span>Projects</span>
                  <Icon name="chevron-down" size={16} className={styles.chevron} />
                </button>
                <div className={styles.groupBody} data-open={projectsOpen}>
                  <ul id="sidebar-projects" className={styles.list} inert={!projectsOpen}>
                    {places.map((place, i) => {
                      const loc = place.location?.trim();
                      return (
                        <li key={place.id} className={styles.stagger} style={{ '--k': 4 + i } as React.CSSProperties}>
                          <Link
                            href={placeHref(place)}
                            className={styles.project}
                            aria-current={pathname === placeHref(place) ? 'page' : undefined}
                            onClick={close}
                            onPointerEnter={(e) => showPreview(place, e.currentTarget)}
                            onPointerLeave={() => setPreview(null)}
                            onFocus={() => setPreview(null)}
                          >
                            <span className={styles.projectName}>{place.name}</span>
                            <span className={styles.count}>{place.photoCount}</span>
                            {loc ? <span className={styles.projectLoc}>{loc}</span> : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          <div className={`${styles.footer} ${styles.stagger}`} style={{ '--k': 4 + places.length } as React.CSSProperties}>
            <div className={styles.mailRow}>
              <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
              <button type="button" className={styles.iconBtn} onClick={copyEmail} aria-label="Copy email address">
                <Icon name="copy" size={16} />
              </button>
            </div>
            {socials.length ? (
              <div className={styles.socials}>
                {socials.map((s) => (
                  <Magnet key={s.id}>
                    <a href={s.href} className={styles.iconBtn} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                      <Icon name={socialIcon(s.id)!} />
                    </a>
                  </Magnet>
                ))}
              </div>
            ) : null}
            <p className={styles.copyright}>
              © {new Date().getFullYear()} {siteCopyrightOwner}. All rights reserved.
            </p>
          </div>
        </div>

        <div className={styles.rail}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onRailChange(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar  ["
          >
            <Icon name="panel-open" />
          </button>
          <Link href="/" className={styles.railWord} aria-label="Home">
            AHMED <b>EMAD</b>
          </Link>
        </div>
      </aside>

      <div
        className={`${styles.preview} ${preview ? styles.previewOn : ''}`}
        style={{ '--pv-y': `${preview?.top ?? 0}px` } as React.CSSProperties}
        aria-hidden
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- warmed Cloudinary thumbnail */}
            <img src={cloudinaryWidth(preview.place.cover, 480)} alt="" />
            <p>
              <b>{preview.place.name}</b>
              {preview.place.location ? `${preview.place.location} · ` : ''}
              {preview.place.photoCount} photograph{preview.place.photoCount === 1 ? '' : 's'}
            </p>
          </>
        ) : null}
      </div>

      <div className={`${styles.scrim} ${mobileOpen ? styles.scrimOn : ''}`} onClick={close} aria-hidden />
    </>
  );
}
