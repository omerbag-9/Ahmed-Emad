'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '@/components/Icon';
import { toast } from '@/lib/feedback';
import type { HomeContent, HomeSlideRef } from '@/lib/home';
import SaveBar from '../../_components/SaveBar';
import styles from '../../_components/admin.module.css';
import home from './home-editor.module.css';

/* Mirrors HOME_LEDE_MAX / HOME_SLIDES_MAX in lib/home.ts (server-only module) */
const LEDE_MAX = 300;
const SLIDES_MAX = 12;

export type SourcePhoto = { id: string; thumb: string; wide: boolean };
export type PhotoSource = { id: string; name: string; photos: SourcePhoto[] };

const key = (r: HomeSlideRef) => `${r.placeId}/${r.photoId}`;

function ChosenTile({ id, thumb, label, index, onRemove }: { id: string; thumb: string; label: string; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.photo} ${isDragging ? styles.dragging : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`Background photo ${index + 1}, from ${label}. Press space to pick up, arrow keys to move.`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail */}
      <img src={thumb} alt="" draggable={false} />
      <span className={styles.photoPos}>{index + 1}</span>
      <div className={styles.photoActions} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <button type="button" className={styles.del} onClick={onRemove} aria-label="Remove from the home page" title="Remove">
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}

export default function HomeEditor({ initial, sources }: { initial: HomeContent; sources: PhotoSource[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [lede, setLede] = useState(initial.lede);
  const [slides, setSlides] = useState<HomeSlideRef[]>(initial.slides);
  const [saving, setSaving] = useState(false);
  const [openSource, setOpenSource] = useState(sources[0]?.id ?? '');

  /* Every photo by key, for thumbnails and labels of the chosen ones */
  const byKey = useMemo(() => {
    const m = new Map<string, { thumb: string; source: string; wide: boolean }>();
    sources.forEach((s) => s.photos.forEach((p) => m.set(`${s.id}/${p.id}`, { thumb: p.thumb, source: s.name, wide: p.wide })));
    return m;
  }, [sources]);
  /* A chosen photo deleted since is dropped from the list (the site skips it too) */
  const chosen = slides.filter((r) => byKey.has(key(r)));
  const chosenKeys = new Set(chosen.map(key));

  const dirty = lede !== saved.lede || JSON.stringify(chosen) !== JSON.stringify(saved.slides.filter((r) => byKey.has(key(r))));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggle = (ref: HomeSlideRef) => {
    if (chosenKeys.has(key(ref))) {
      setSlides(chosen.filter((r) => key(r) !== key(ref)));
      return;
    }
    if (chosen.length >= SLIDES_MAX) {
      toast(`Up to ${SLIDES_MAX} photos. Remove one first.`);
      return;
    }
    setSlides([...chosen, ref]);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = chosen.findIndex((r) => key(r) === active.id);
    const to = chosen.findIndex((r) => key(r) === over.id);
    setSlides(arrayMove(chosen, from, to));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/home', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lede, slides: chosen }),
      });
      if (!res.ok) throw new Error('Save failed. Are you still signed in?');
      const next = (await res.json()) as HomeContent;
      setSaved(next);
      setLede(next.lede);
      setSlides(next.slides);
      toast('Saved. The home page is updated.');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const source = sources.find((s) => s.id === openSource);

  return (
    <>
      <Link href="/admin" className={styles.crumb}>
        <Icon name="arrow-left" size={16} />
        Overview
      </Link>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Home page</h1>
          <p className={styles.sub}>The photographs behind the name and the line under it.</p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.btn} href="/">
            <Icon name="external" size={16} />
            View home page
          </Link>
        </div>
      </div>

      <section className={styles.panel} aria-labelledby="lede-title">
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle} id="lede-title">
            Line under the name
          </h2>
        </div>
        <div className={styles.field} style={{ marginBottom: 0 }}>
          <label htmlFor="home-lede">
            Text
            <span>
              {lede.length} / {LEDE_MAX}
            </span>
          </label>
          <textarea
            id="home-lede"
            className={styles.input}
            value={lede}
            maxLength={LEDE_MAX}
            onChange={(e) => setLede(e.target.value)}
            style={{ minHeight: 80 }}
          />
          <span className={styles.help}>One or two short sentences read best. Leave it empty to show only the name and the button.</span>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="slides-title">
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle} id="slides-title">
            Background photos
          </h2>
          <p className={styles.panelNote}>
            {chosen.length} of {SLIDES_MAX} chosen
          </p>
        </div>
        {chosen.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={chosen.map(key)} strategy={rectSortingStrategy}>
              <div className={`${styles.photoGrid} ${home.chosen}`}>
                {chosen.map((r, i) => {
                  const info = byKey.get(key(r))!;
                  return <ChosenTile key={key(r)} id={key(r)} thumb={info.thumb} label={info.source} index={i} onRemove={() => toggle(r)} />;
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <p className={styles.empty}>None chosen, so the page shows one wide photo from each project. Pick photos below to choose them yourself.</p>
        )}
        <p className={styles.hint}>
          They crossfade in this order, about every 6 seconds. Wide photos fill the screen best. Drag to reorder, or focus one,
          press <span className={styles.kbd}>Space</span> and use the arrow keys.
        </p>
      </section>

      <section className={styles.panel} aria-labelledby="pick-title">
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle} id="pick-title">
            Choose photos
          </h2>
          <p className={styles.panelNote}>Click a photo to add or remove it</p>
        </div>
        <div className={home.tabs} role="tablist" aria-label="Where the photos come from">
          {sources.map((s) => {
            const n = chosen.filter((r) => r.placeId === s.id).length;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === openSource}
                className={home.tab}
                onClick={() => setOpenSource(s.id)}
              >
                {s.name}
                {n ? <span className={home.tabCount}>{n}</span> : null}
              </button>
            );
          })}
        </div>
        {source ? (
          <div className={styles.photoGrid} role="tabpanel" aria-label={source.name}>
            {source.photos.map((p) => {
              const ref = { placeId: source.id, photoId: p.id };
              const on = chosenKeys.has(key(ref));
              const pos = on ? chosen.findIndex((r) => key(r) === key(ref)) + 1 : 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${home.pick} ${on ? home.pickOn : ''}`}
                  aria-pressed={on}
                  aria-label={`${on ? 'Remove' : 'Add'} this ${p.wide ? 'wide ' : ''}photo from ${source.name}`}
                  onClick={() => toggle(ref)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail */}
                  <img src={p.thumb} alt="" loading="lazy" draggable={false} />
                  {p.wide ? <span className={home.wide}>Wide</span> : null}
                  {on ? (
                    <span className={home.check}>
                      <Icon name="check" size={14} />
                      {pos}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className={styles.empty}>No photos yet. Add photos to a project or the main portfolio first.</p>
        )}
      </section>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => {
          setLede(saved.lede);
          setSlides(saved.slides);
        }}
      />
    </>
  );
}
