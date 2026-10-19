'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { toast } from '@/lib/feedback';
import styles from '../../../_components/admin.module.css';

const BRIEF_MAX = 160;

export default function NewPlace() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [brief, setBrief] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the project a name.');
      document.getElementById('new-name')?.focus();
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), brief, description, location: location.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Could not create the project.');
      }
      const place = (await res.json()) as { id: string };
      toast('Project created. Now add its photographs.');
      router.push(`/admin/places/${place.id}/edit`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.');
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <Link href="/admin" className={styles.crumb}>
        <Icon name="arrow-left" size={16} />
        Overview
      </Link>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>New project</h1>
          <p className={styles.sub}>Name it and add the location. The photographs come next, on the project’s page.</p>
        </div>
      </div>

      <form className={styles.panel} style={{ maxWidth: 640 }} onSubmit={handleSubmit} noValidate aria-label="New project">
        <div className={styles.field} data-error={error ? 'true' : undefined}>
          <label htmlFor="new-name">Name</label>
          <input
            id="new-name"
            className={styles.input}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            autoComplete="off"
            autoFocus
          />
          {error ? <span className={styles.error}>{error}</span> : null}
        </div>
        <div className={styles.field}>
          <label htmlFor="new-location">Location</label>
          <input
            id="new-location"
            className={styles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="District, city"
          />
          <span className={styles.help}>Shown under the name in the sidebar and the title bar.</span>
        </div>
        <div className={styles.field}>
          <label htmlFor="new-brief">
            Brief
            <span>
              {brief.length} / {BRIEF_MAX}
            </span>
          </label>
          <textarea
            id="new-brief"
            className={styles.input}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            maxLength={BRIEF_MAX}
            style={{ minHeight: 90 }}
            placeholder="One or two sentences. Used as the description in search results."
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="new-description">Description</label>
          <textarea id="new-description" className={styles.input} value={description} onChange={(e) => setDescription(e.target.value)} />
          <span className={styles.help}>Kept with the project; not shown on the site yet.</span>
        </div>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
          {saving ? (
            <>
              <span className={styles.spinner} aria-hidden />
              Creating
            </>
          ) : (
            <>
              Create project
              <Icon name="arrow-right" size={16} />
            </>
          )}
        </button>
      </form>
    </>
  );
}
