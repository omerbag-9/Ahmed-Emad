'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../admin.module.css';
import { acceptImageFile } from '@/lib/acceptImageFile';
import { uploadPlacePhotosWithFallback } from '@/lib/adminCloudinaryUpload';

export default function NewPlace() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [brief, setBrief] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);
  const router = useRouter();

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles).filter((f) => acceptImageFile(f));
    setFiles(prev => [...prev, ...fileArray]);

    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setLoading(true);

    try {
      // Create place first
      const placeRes = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, brief, description, location }),
      });

      if (!placeRes.ok) throw new Error('Failed to create place');
      const place = await placeRes.json();

      // Upload photos if any
      if (files.length > 0) {
        setUploadProgress(10);
        const uploadRes = await uploadPlacePhotosWithFallback(place.id, files);
        setUploadProgress(100);

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Failed to upload photos');
        }
      }

      router.push('/admin');
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create place. Please try again.');
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>ADD NEW PLACE</span>
        <div className={styles.topBarActions}>
          <Link href="/admin" className={styles.topBarLink}>← Back to Dashboard</Link>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.formInput}
                placeholder="e.g., ESCA Cueva"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Location / branch</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={styles.formInput}
                placeholder="e.g., Cairo · New Cairo, or Mall of Egypt"
              />
              <p className={styles.formHint}>
                Shown under the project name in the sidebar — useful when the same brand has multiple branches.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Brief</label>
              <input
                type="text"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className={styles.formInput}
                placeholder="Optional short line (stored with the project)"
              />
              <p className={styles.formHint}>
                Optional. Saved on the project; the public gallery currently shows the project name only.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.formTextarea}
                placeholder="Longer project story, context, or credits..."
                rows={5}
              />
              <p className={styles.formHint}>
                Saved on the project; not shown on the public gallery right now.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Photos</label>
              <div
                className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneDragOver : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className={styles.uploadZoneText}>
                  Drop images here or click to browse
                </p>
                <p className={styles.uploadZoneSubtext}>
                  Supports JPEG, PNG, WebP — images will be auto-optimized
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                style={{ display: 'none' }}
              />

              {previews.length > 0 && (
                <div className={styles.uploadPreview}>
                  {previews.map((preview, i) => (
                    <div key={i} className={styles.uploadPreviewItem}>
                      <img src={preview} alt="" className={styles.uploadPreviewImage} />
                      <button
                        type="button"
                        className={styles.uploadPreviewRemove}
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            <div className={styles.formActions}>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Creating...' : 'Create Place'}
              </button>
              <Link href="/admin" className={styles.cancelBtn}>Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
