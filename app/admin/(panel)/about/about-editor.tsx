'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import type { AboutContent } from '@/lib/about';
import { acceptImageFile } from '@/lib/acceptImageFile';
import { uploadAboutPhotoWithFallback } from '@/lib/adminCloudinaryUpload';
import { toast } from '@/lib/feedback';
import SaveBar from '../../_components/SaveBar';
import { useConfirm } from '../../_components/useConfirm';
import styles from '../../_components/admin.module.css';

type Text = Pick<AboutContent, 'title' | 'lead' | 'body' | 'bodyExtra' | 'imageAlt'>;

const pick = (a: AboutContent): Text => ({
  title: a.title,
  lead: a.lead,
  body: a.body,
  bodyExtra: a.bodyExtra,
  imageAlt: a.imageAlt,
});

export default function AboutEditor({ initial }: { initial: AboutContent }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [data, setData] = useState(initial);
  const [form, setForm] = useState<Text>(pick(initial));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saved = pick(data);
  const dirty = (Object.keys(form) as (keyof Text)[]).some((k) => form[k] !== saved[k]);
  const set = (k: keyof Text) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/about', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        /* The eyebrow is no longer shown on the page; send the stored value unchanged */
        body: JSON.stringify({ eyebrow: data.eyebrow, ...form }),
      });
      if (!res.ok) throw new Error('Save failed. Are you still signed in?');
      const json = (await res.json()) as AboutContent;
      setData(json);
      setForm(pick(json));
      toast('Saved');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file || !acceptImageFile(file)) return;
    setUploading(true);
    try {
      const res = await uploadAboutPhotoWithFallback(file);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Image upload failed.');
      }
      const json = (await res.json()) as { about: AboutContent };
      setData(json.about);
      toast('Portrait replaced');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    const ok = await confirm({
      title: 'Remove the portrait?',
      body: 'The About page will show the text only until you add a new photo.',
      confirm: 'Remove portrait',
    });
    if (!ok) return;
    const res = await fetch('/api/about', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearImage: true }),
    });
    if (!res.ok) {
      toast('Could not remove the portrait');
      return;
    }
    setData((await res.json()) as AboutContent);
    toast('Portrait removed');
    router.refresh();
  };

  const image = data.imageSrc?.trim();

  return (
    <>
      <Link href="/admin" className={styles.crumb}>
        <Icon name="arrow-left" size={16} />
        Overview
      </Link>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>About page</h1>
          <p className={styles.sub}>The preview follows as you type. Text goes live when you save; a new portrait goes live at once.</p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.btn} href="/about">
            <Icon name="external" size={16} />
            View on site
          </Link>
        </div>
      </div>

      <div className={styles.editor}>
        <form
          className={styles.panel}
          aria-label="About page content"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className={styles.field}>
            <label htmlFor="about-title">Title</label>
            <input id="about-title" className={styles.input} value={form.title} onChange={set('title')} />
          </div>
          <div className={styles.field}>
            <label htmlFor="about-lead">Lead</label>
            <textarea id="about-lead" className={styles.input} value={form.lead} onChange={set('lead')} style={{ minHeight: 100 }} />
            <span className={styles.help}>The large opening sentence.</span>
          </div>
          <div className={styles.field}>
            <label htmlFor="about-body">Body</label>
            <textarea id="about-body" className={styles.input} value={form.body} onChange={set('body')} style={{ minHeight: 160 }} />
          </div>
          <div className={styles.field}>
            <label htmlFor="about-extra">Closing line</label>
            <textarea id="about-extra" className={styles.input} value={form.bodyExtra} onChange={set('bodyExtra')} style={{ minHeight: 70 }} />
            <span className={styles.help}>Shown as a quote below the body.</span>
          </div>
          <div className={styles.field}>
            <label htmlFor="about-alt">Portrait description</label>
            <input id="about-alt" className={styles.input} value={form.imageAlt} onChange={set('imageAlt')} />
            <span className={styles.help}>Read aloud by screen readers in place of the photo.</span>
          </div>
          <div className={styles.field} style={{ marginBottom: 0 }}>
            <label>Portrait</label>
            <div className={styles.portraitRow}>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- portrait thumbnail
                <img src={image} alt="" />
              ) : (
                <span className={styles.portraitNone} />
              )}
              <button type="button" className={styles.btn} onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <span className={styles.spinner} aria-hidden /> : <Icon name="upload" size={16} />}
                {uploading ? 'Uploading' : image ? 'Replace photo' : 'Add photo'}
              </button>
              {image ? (
                <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={removeImage} disabled={uploading}>
                  Remove
                </button>
              ) : null}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files)} />
            </div>
          </div>
        </form>

        <section className={styles.panel} aria-labelledby="preview-title">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle} id="preview-title">
              Preview
            </h2>
            <p className={styles.panelNote}>As it appears at /about</p>
          </div>
          <div className={styles.preview}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- portrait preview
              <img src={image} alt="" />
            ) : (
              <span className={styles.previewNoImg} />
            )}
            <div>
              <p className={styles.previewTitle}>{form.title.trim() || 'About'}</p>
              {form.lead.trim() ? <p className={styles.previewLead}>{form.lead}</p> : null}
              {form.body.trim() ? <p className={styles.previewBody}>{form.body}</p> : null}
              {form.bodyExtra.trim() ? <p className={styles.previewQuote}>{form.bodyExtra}</p> : null}
            </div>
          </div>
        </section>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setForm(saved)} />
      {dialog}
    </>
  );
}
