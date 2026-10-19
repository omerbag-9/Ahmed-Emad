'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { uploadPlacePhotosWithFallback } from '@/lib/adminCloudinaryUpload';
import { toast } from '@/lib/feedback';
import PhotoManager, { type AdminPhoto } from '../../../../_components/PhotoManager';
import SaveBar from '../../../../_components/SaveBar';
import { useConfirm } from '../../../../_components/useConfirm';
import styles from '../../../../_components/admin.module.css';

type Details = { name: string; location: string; brief: string; description: string };
type PlaceData = Details & { id: string; slug: string; photos: AdminPhoto[] };

const BRIEF_MAX = 160;

async function errorText(res: Response, fallback: string) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error || fallback;
}

export default function ProjectEditor({ place }: { place: PlaceData }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [saved, setSaved] = useState<Details>({
    name: place.name,
    location: place.location,
    brief: place.brief,
    description: place.description,
  });
  const [form, setForm] = useState<Details>(saved);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [photoCount, setPhotoCount] = useState(place.photos.length);

  const dirty = (Object.keys(form) as (keyof Details)[]).some((k) => form[k] !== saved[k]);
  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (k === 'name') setNameError('');
  };

  const save = async () => {
    if (!form.name.trim()) {
      setNameError('Give the project a name.');
      document.getElementById('project-name')?.focus();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/places/${place.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name: form.name.trim(), location: form.location.trim() }),
      });
      if (!res.ok) throw new Error(await errorText(res, 'Could not save.'));
      setSaved(form);
      toast('Saved');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async () => {
    const ok = await confirm({
      title: `Delete ${place.name}?`,
      body: `This removes the project and its ${photoCount} photograph${photoCount === 1 ? '' : 's'} from the site. It cannot be undone.`,
      confirm: 'Delete project',
    });
    if (!ok) return;
    const res = await fetch(`/api/places/${place.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast('Could not delete the project');
      return;
    }
    toast(`${place.name} deleted`);
    router.push('/admin');
    router.refresh();
  };

  const reload = useCallback(async () => {
    const res = await fetch(`/api/places/${place.id}`, { cache: 'no-store' });
    const data = (await res.json()) as { photos: AdminPhoto[] };
    setPhotoCount(data.photos.length);
    router.refresh();
    return data.photos.map(({ id, src, thumbnail, alt }) => ({ id, src, thumbnail, alt }));
  }, [place.id, router]);

  const saveOrder = useCallback(
    async (orderedPhotoIds: string[]) => {
      const res = await fetch(`/api/places/${place.id}/photos/order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedPhotoIds }),
      });
      if (res.ok) router.refresh();
      return res.ok;
    },
    [place.id, router]
  );

  const deletePhoto = useCallback(
    async (photoId: string, keepalive = false) => {
      const res = await fetch(`/api/places/${place.id}/photos/${photoId}`, { method: 'DELETE', keepalive });
      if (res.ok && !keepalive) {
        setPhotoCount((n) => n - 1);
        router.refresh();
      }
      return res.ok;
    },
    [place.id, router]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const res = await uploadPlacePhotosWithFallback(place.id, [file]);
      if (!res.ok) throw new Error(await errorText(res, 'Upload failed'));
    },
    [place.id]
  );

  return (
    <>
      <Link href="/admin" className={styles.crumb}>
        <Icon name="arrow-left" size={16} />
        Overview
      </Link>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{saved.name}</h1>
          <p className={styles.sub}>
            {saved.location ? `${saved.location} · ` : ''}
            {photoCount} photograph{photoCount === 1 ? '' : 's'} · shown at /portfolio/{place.slug}
          </p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.btn} href={`/portfolio/${place.slug}`}>
            <Icon name="external" size={16} />
            View on site
          </Link>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={removeProject}>
            <Icon name="trash" size={16} />
            Delete
          </button>
        </div>
      </div>

      <div className={styles.editor}>
        <form
          className={styles.panel}
          aria-label="Project details"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Details</h2>
          </div>
          <div className={styles.field} data-error={nameError ? 'true' : undefined}>
            <label htmlFor="project-name">Name</label>
            <input id="project-name" className={styles.input} value={form.name} onChange={set('name')} autoComplete="off" />
            <span className={styles.address}>
              Address: /portfolio/<b>{place.slug}</b> · stays the same when you rename, so shared links keep working
            </span>
            {nameError ? <span className={styles.error}>{nameError}</span> : null}
          </div>
          <div className={styles.field}>
            <label htmlFor="project-location">Location</label>
            <input
              id="project-location"
              className={styles.input}
              value={form.location}
              onChange={set('location')}
              placeholder="District, city"
            />
            <span className={styles.help}>Shown under the name in the sidebar and the title bar.</span>
          </div>
          <div className={styles.field}>
            <label htmlFor="project-brief">
              Brief
              <span>
                {form.brief.length} / {BRIEF_MAX}
              </span>
            </label>
            <textarea
              id="project-brief"
              className={styles.input}
              value={form.brief}
              onChange={set('brief')}
              maxLength={BRIEF_MAX}
              style={{ minHeight: 90 }}
              placeholder="One or two sentences. Used as the description in search results."
            />
          </div>
          <div className={styles.field} style={{ marginBottom: 0 }}>
            <label htmlFor="project-description">Description</label>
            <textarea id="project-description" className={styles.input} value={form.description} onChange={set('description')} />
            <span className={styles.help}>Kept with the project; not shown on the site yet.</span>
          </div>
        </form>

        <PhotoManager
          title="Photographs"
          hint="The first photograph is the cover in the sidebar preview and on the overview."
          coverLabel="Cover"
          initialPhotos={place.photos}
          saveOrder={saveOrder}
          deletePhoto={deletePhoto}
          uploadFile={uploadFile}
          reload={reload}
        />
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setForm(saved)} />
      {dialog}
    </>
  );
}
