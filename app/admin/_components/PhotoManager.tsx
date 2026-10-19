'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '@/components/Icon';
import { acceptImageFile } from '@/lib/acceptImageFile';
import { toast } from '@/lib/feedback';
import styles from './admin.module.css';

export type AdminPhoto = { id: string; src: string; thumbnail: string; alt: string };

type Upload = { key: string; name: string; preview: string; state: 'waiting' | 'uploading' | 'failed'; error?: string };

const UNDO_MS = 5000;

function SortablePhoto({
  photo,
  index,
  total,
  coverLabel,
  onFirst,
  onDelete,
}: {
  photo: AdminPhoto;
  index: number;
  total: number;
  coverLabel?: string;
  onFirst: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.photo} ${isDragging ? styles.dragging : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`Photograph ${index + 1} of ${total}. Press space to pick up, arrow keys to move.`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail */}
      <img src={photo.thumbnail || photo.src} alt="" loading="lazy" draggable={false} />
      {index === 0 && coverLabel ? (
        <span className={styles.photoCover}>
          <Icon name="star" size={14} />
          {coverLabel}
        </span>
      ) : null}
      <span className={styles.photoPos}>{index + 1}</span>
      <div className={styles.photoActions} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {index > 0 ? (
          <button type="button" onClick={onFirst} aria-label="Move to first" title={coverLabel ? 'Move to first (cover)' : 'Move to first'}>
            <Icon name="star" size={16} />
          </button>
        ) : null}
        <button type="button" className={styles.del} onClick={onDelete} aria-label="Delete photograph" title="Delete">
          <Icon name="trash" size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Photo grid for a project or the main portfolio. Order and deletes are saved at once (as before);
 * a delete waits 5 seconds so it can be undone. Dropped files upload straight away, one at a time,
 * each with its own status.
 */
export default function PhotoManager({
  title,
  hint,
  initialPhotos,
  coverLabel,
  saveOrder,
  deletePhoto,
  uploadFile,
  reload,
}: {
  title: string;
  hint: string;
  initialPhotos: AdminPhoto[];
  coverLabel?: string;
  saveOrder: (ids: string[]) => Promise<boolean>;
  /** `keepalive` is set when the page is closing with a delete still waiting */
  deletePhoto: (id: string, keepalive?: boolean) => Promise<boolean>;
  uploadFile: (file: File) => Promise<void>;
  /** Fresh list from the server after uploads */
  reload: () => Promise<AdminPhoto[]>;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const files = useRef(new Map<string, File>());
  const busy = useRef(false);
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /* Send any delete still waiting for its Undo window: before a reorder and when leaving */
  const flushDeletes = useCallback(
    async (keepalive = false) => {
      const ids = [...pendingDeletes.current.keys()];
      pendingDeletes.current.forEach((t) => clearTimeout(t));
      pendingDeletes.current.clear();
      await Promise.all(ids.map((id) => deletePhoto(id, keepalive)));
    },
    [deletePhoto]
  );

  useEffect(() => {
    const onLeave = () => void flushDeletes(true);
    addEventListener('pagehide', onLeave);
    return () => {
      removeEventListener('pagehide', onLeave);
      void flushDeletes(true);
    };
  }, [flushDeletes]);

  const commitOrder = async (next: AdminPhoto[], prev: AdminPhoto[], message = 'Order saved') => {
    setPhotos(next);
    await flushDeletes();
    const ok = await saveOrder(next.map((p) => p.id));
    if (ok) toast(message);
    else {
      setPhotos(prev);
      toast('Could not save the order. Try again.');
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over: target } = e;
    if (!target || active.id === target.id) return;
    const from = photos.findIndex((p) => p.id === active.id);
    const to = photos.findIndex((p) => p.id === target.id);
    void commitOrder(arrayMove(photos, from, to), photos);
  };

  const moveFirst = (id: string) => {
    const i = photos.findIndex((p) => p.id === id);
    if (i <= 0) return;
    void commitOrder(arrayMove(photos, i, 0), photos, coverLabel ? 'Moved to first, now the cover' : 'Moved to first');
  };

  const remove = (id: string) => {
    const i = photos.findIndex((p) => p.id === id);
    const photo = photos[i];
    if (!photo) return;
    setPhotos((list) => list.filter((p) => p.id !== id));
    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(id);
      const ok = await deletePhoto(id);
      if (!ok) {
        setPhotos((list) => [...list.slice(0, i), photo, ...list.slice(i)]);
        toast('Could not delete the photograph');
      }
    }, UNDO_MS);
    pendingDeletes.current.set(id, timer);
    toast('Photograph deleted', {
      label: 'Undo',
      onClick: () => {
        const t = pendingDeletes.current.get(id);
        if (!t) return;
        clearTimeout(t);
        pendingDeletes.current.delete(id);
        setPhotos((list) => [...list.slice(0, i), photo, ...list.slice(i)]);
      },
    });
  };

  /* The queue lives in a ref (read by the upload loop); `uploads` state mirrors it for rendering */
  const queue = useRef<Upload[]>([]);
  const setQueue = (next: Upload[]) => {
    queue.current = next;
    setUploads(next);
  };
  const patch = (key: string, change: Partial<Upload>) =>
    setQueue(queue.current.map((u) => (u.key === key ? { ...u, ...change } : u)));

  /* Uploads run one after another so each tile can show where it is */
  const runQueue = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      let item: Upload | undefined;
      while ((item = queue.current.find((u) => u.state === 'waiting'))) {
        const { key, preview } = item;
        patch(key, { state: 'uploading' });
        const file = files.current.get(key);
        if (!file) {
          setQueue(queue.current.filter((u) => u.key !== key));
          continue;
        }
        try {
          await uploadFile(file);
          setPhotos(await reload());
          files.current.delete(key);
          URL.revokeObjectURL(preview);
          setQueue(queue.current.filter((u) => u.key !== key));
        } catch (err) {
          patch(key, { state: 'failed', error: err instanceof Error ? err.message : 'Upload failed' });
        }
      }
    } finally {
      busy.current = false;
    }
  };

  const addFiles = (list: FileList | File[]) => {
    const accepted = Array.from(list).filter((f) => acceptImageFile(f));
    if (!accepted.length) {
      toast('Those files are not images');
      return;
    }
    const items: Upload[] = accepted.map((f, i) => {
      const key = `${Date.now()}-${i}-${f.name}`;
      files.current.set(key, f);
      return { key, name: f.name, preview: URL.createObjectURL(f), state: 'waiting' };
    });
    setQueue([...queue.current, ...items]);
    toast(`Uploading ${accepted.length} photograph${accepted.length > 1 ? 's' : ''}`);
    void runQueue();
  };

  const retry = (key: string) => {
    patch(key, { state: 'waiting', error: undefined });
    void runQueue();
  };

  const dismiss = (key: string) => {
    const u = queue.current.find((x) => x.key === key);
    if (u) URL.revokeObjectURL(u.preview);
    files.current.delete(key);
    setQueue(queue.current.filter((x) => x.key !== key));
  };

  const active = photos.find((p) => p.id === activeId);

  return (
    <section className={styles.panel} aria-label={title}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{title}</h2>
        <p className={styles.panelNote}>
          {photos.length} photograph{photos.length === 1 ? '' : 's'}
        </p>
      </div>

      <div
        className={`${styles.drop} ${over ? styles.dropOver : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Add photographs"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" size={24} />
        <b>Drop photographs here or choose files</b>
        <small>They upload straight away. Large files are resized in the browser first.</small>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className={styles.photoGrid}>
            {photos.map((p, i) => (
              <SortablePhoto
                key={p.id}
                photo={p}
                index={i}
                total={photos.length}
                coverLabel={coverLabel}
                onFirst={() => moveFirst(p.id)}
                onDelete={() => remove(p.id)}
              />
            ))}
            {uploads.map((u) => (
              <div key={u.key} className={`${styles.photo} ${styles.uploading} ${u.state === 'failed' ? styles.uploadFailed : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
                <img src={u.preview} alt="" />
                <span className={styles.uploadState}>
                  {u.state === 'failed' ? (
                    <>
                      {u.error || 'Upload failed'}
                      <span style={{ display: 'flex', gap: 4 }}>
                        <button type="button" className={styles.btn} onClick={() => retry(u.key)}>
                          Retry
                        </button>
                        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => dismiss(u.key)}>
                          Remove
                        </button>
                      </span>
                    </>
                  ) : u.state === 'uploading' ? (
                    'Uploading'
                  ) : (
                    'Waiting'
                  )}
                </span>
                {u.state !== 'failed' ? (
                  <span className={styles.uploadBar} aria-hidden>
                    {u.state === 'uploading' ? <i /> : null}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' }}>
          {active ? (
            <div className={styles.overlayPhoto}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail */}
              <img src={active.thumbnail || active.src} alt="" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {photos.length === 0 && uploads.length === 0 ? <p className={styles.empty}>No photographs yet.</p> : null}
      <p className={styles.hint}>
        {hint} Drag to reorder, or focus a photo, press <span className={styles.kbd}>Space</span>, move with the arrow
        keys and press <span className={styles.kbd}>Space</span> again.
      </p>
    </section>
  );
}
