'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '@/components/Icon';
import { toast } from '@/lib/feedback';
import styles from '../_components/admin.module.css';

type Project = { id: string; slug: string; name: string; location: string; photoCount: number; cover: string };

const plural = (n: number) => `${n} photograph${n === 1 ? '' : 's'}`;

function ProjectRow({ p }: { p: Project }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: p.id,
  });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.row} ${isDragging ? styles.dragging : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={styles.grip}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${p.name}. Press space to pick up, arrow keys to move.`}
      >
        <Icon name="grip" size={16} />
      </button>
      {p.cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail
        <img className={styles.rowThumb} src={p.cover} alt="" />
      ) : (
        <span className={styles.rowThumb} />
      )}
      <span>
        <span className={styles.rowName}>{p.name}</span>
        {p.location ? <span className={styles.rowMeta}>{p.location}</span> : null}
      </span>
      <span className={styles.rowCount}>{plural(p.photoCount)}</span>
      <span className={styles.rowActions}>
        <Link className={styles.iconBtn} href={`/portfolio/${p.slug}`} aria-label={`View ${p.name} on the site`} title="View on site">
          <Icon name="eye" size={16} />
        </Link>
        <Link className={styles.btn} href={`/admin/places/${p.id}/edit`}>
          Edit
        </Link>
      </span>
    </div>
  );
}

export default function AdminDashboard({
  projects: initial,
  portfolioCount,
  portfolioThumbs,
  about,
  home,
}: {
  projects: Project[];
  portfolioCount: number;
  portfolioThumbs: string[];
  about: { lead: string; image: string };
  home: { lede: string; desktop: number; mobile: number };
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const total = projects.reduce((n, p) => n + p.photoCount, 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /* Saved at once; the site sidebar uses the same order */
  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const prev = projects;
    const next = arrayMove(prev, prev.findIndex((p) => p.id === active.id), prev.findIndex((p) => p.id === over.id));
    setProjects(next);
    try {
      const res = await fetch('/api/places', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedPlaceIds: next.map((p) => p.id) }),
      });
      if (!res.ok) throw new Error();
      toast('Project order saved');
      router.refresh();
    } catch {
      setProjects(prev);
      toast('Could not save the order. Try again.');
    }
  };

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.sub}>
            {projects.length} project{projects.length === 1 ? '' : 's'} in the sidebar, {plural(total)} across them, and{' '}
            {portfolioCount} on the main portfolio.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.btn} href="/portfolio">
            <Icon name="external" size={16} />
            View site
          </Link>
          <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/admin/places/new">
            <Icon name="plus" size={16} />
            New project
          </Link>
        </div>
      </div>

      <div className={styles.overview}>
        <section className={styles.panel} aria-labelledby="projects-title">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle} id="projects-title">
              Projects
            </h2>
            <p className={styles.panelNote}>Order here is the order in the site sidebar</p>
          </div>
          {projects.length ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className={styles.rows}>
                  {projects.map((p) => (
                    <ProjectRow key={p.id} p={p} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className={styles.empty}>No projects yet. Create the first one with New project.</p>
          )}
          <p className={styles.hint}>
            Drag by the handle, or focus it and press <span className={styles.kbd}>Space</span>, then the arrow keys.
            Changes save at once.
          </p>
        </section>

        <div className={styles.side}>
          <section className={styles.panel} aria-labelledby="home-title">
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle} id="home-title">
                Home page
              </h2>
              <p className={styles.panelNote}>
                Desktop {home.desktop ? `${home.desktop} chosen` : 'automatic'} · Phone {home.mobile ? `${home.mobile} chosen` : 'automatic'}
              </p>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{home.lede || 'No line under the name.'}</p>
            <Link className={styles.btn} href="/admin/home" style={{ marginTop: 14 }}>
              Edit home page
            </Link>
          </section>

          <section className={styles.panel} aria-labelledby="portfolio-title">
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle} id="portfolio-title">
                Main portfolio
              </h2>
              <p className={styles.panelNote}>{plural(portfolioCount)}</p>
            </div>
            {portfolioThumbs.length ? (
              <div className={styles.thumbs}>
                {portfolioThumbs.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail
                  <img key={src} src={src} alt="" loading="lazy" />
                ))}
              </div>
            ) : null}
            <p className={styles.hint}>Its own selection and order, separate from the projects.</p>
            <Link className={styles.btn} href="/admin/portfolio" style={{ marginTop: 14 }}>
              Manage main portfolio
            </Link>
          </section>

          <section className={styles.panel} aria-labelledby="about-title">
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle} id="about-title">
                About page
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 14, alignItems: 'start' }}>
              {about.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- portrait thumbnail
                <img src={about.image} alt="" className={styles.portraitNone} style={{ width: 72 }} />
              ) : (
                <span className={styles.portraitNone} style={{ width: 72 }} />
              )}
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                {about.lead ? (about.lead.length > 110 ? `${about.lead.slice(0, 110)}…` : about.lead) : 'No text yet.'}
              </p>
            </div>
            <Link className={styles.btn} href="/admin/about" style={{ marginTop: 14 }}>
              Edit about page
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
