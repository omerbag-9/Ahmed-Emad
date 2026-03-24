'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../admin.module.css';
import type { AboutContent } from '@/lib/about';
import { acceptImageFile } from '@/lib/acceptImageFile';
import { uploadAboutPhotoWithFallback } from '@/lib/adminCloudinaryUpload';

export default function AboutEditor() {
  const [data, setData] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/about', { cache: 'no-store' });
      const json = (await res.json()) as AboutContent;
      setData(json);
    } catch {
      setMessage('Failed to load about content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/about', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eyebrow: data.eyebrow,
          title: data.title,
          lead: data.lead,
          body: data.body,
          bodyExtra: data.bodyExtra,
          imageAlt: data.imageAlt,
        }),
      });
      if (!res.ok) {
        setMessage('Save failed. Are you signed in?');
        return;
      }
      const json = (await res.json()) as AboutContent;
      setData(json);
      setMessage('Saved.');
    } catch {
      setMessage('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !acceptImageFile(file)) return;
    setUploading(true);
    setMessage('');
    try {
      const res = await uploadAboutPhotoWithFallback(file);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage((err as { error?: string }).error || 'Image upload failed.');
        return;
      }
      const json = (await res.json()) as { about: AboutContent };
      setData(json.about);
      setMessage('Image updated.');
    } catch {
      setMessage('Image upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = async () => {
    if (!confirm('Remove the portrait from the About page?')) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/about', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearImage: true }),
      });
      if (!res.ok) {
        setMessage('Could not remove image.');
        return;
      }
      const json = (await res.json()) as AboutContent;
      setData(json);
      setMessage('Image removed.');
    } catch {
      setMessage('Could not remove image.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <>
        <div className={styles.topBar}>
          <span className={styles.topBarTitle}>ABOUT PAGE</span>
          <div className={styles.topBarActions}>
            <Link href="/admin" className={styles.topBarLink}>
              ← Dashboard
            </Link>
          </div>
        </div>
        <div className={styles.container}>
          <div className={styles.emptyState}>Loading…</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>ABOUT PAGE</span>
        <div className={styles.topBarActions}>
          <Link href="/admin" className={styles.topBarLink}>
            ← Dashboard
          </Link>
          <Link
            href="/about"
            className={styles.topBarLink}
            target="_blank"
            rel="noreferrer"
          >
            View /about →
          </Link>
        </div>
      </div>

      <div className={styles.container}>
        <p className={`${styles.sectionHint} ${styles.introBlock}`}>
          Text and portrait shown on the public <strong>/about</strong> page. Click{' '}
          <strong>Save changes</strong> after editing copy.
        </p>

        {message ? (
          <p className={styles.sectionHint} style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>
        ) : null}

        <div className={`${styles.formCard} ${styles.formCardFullWidth}`}>
          <h2 className={styles.formTitle}>Portrait</h2>

          <div className={styles.formGroup}>
            {data.imageSrc ? (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Image
                  src={data.imageSrc}
                  alt={data.imageAlt || 'About'}
                  width={200}
                  height={250}
                  style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => void removeImage()}
                    disabled={saving || uploading}
                  >
                    Remove image
                  </button>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Replace image'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={styles.uploadZone}
                onClick={() => !uploading && fileRef.current?.click()}
                style={{ cursor: uploading ? 'wait' : 'pointer' }}
              >
                <p className={styles.uploadZoneText}>
                  {uploading ? 'Uploading…' : 'Click to upload a portrait (recommended: vertical photo)'}
                </p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => void handleUpload(e.target.files)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="about-image-alt">
              Image alt text (accessibility)
            </label>
            <input
              id="about-image-alt"
              className={styles.formInput}
              value={data.imageAlt}
              onChange={(e) => setData({ ...data, imageAlt: e.target.value })}
              placeholder="Describe the photo for screen readers"
            />
          </div>

          <h2 className={styles.formTitle} style={{ marginTop: '1.5rem' }}>
            Copy
          </h2>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="about-eyebrow">
              Eyebrow (small line above title)
            </label>
            <input
              id="about-eyebrow"
              className={styles.formInput}
              value={data.eyebrow}
              onChange={(e) => setData({ ...data, eyebrow: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="about-title">
              Page title
            </label>
            <input
              id="about-title"
              className={styles.formInput}
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="about-lead">
              Lead paragraph
            </label>
            <textarea
              id="about-lead"
              className={styles.formTextarea}
              rows={5}
              value={data.lead}
              onChange={(e) => setData({ ...data, lead: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="about-body">
              Body paragraph
            </label>
            <textarea
              id="about-body"
              className={styles.formTextarea}
              rows={5}
              value={data.body}
              onChange={(e) => setData({ ...data, body: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="about-extra">
              Closing line (optional)
            </label>
            <textarea
              id="about-extra"
              className={styles.formTextarea}
              rows={3}
              value={data.bodyExtra}
              onChange={(e) => setData({ ...data, bodyExtra: e.target.value })}
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
