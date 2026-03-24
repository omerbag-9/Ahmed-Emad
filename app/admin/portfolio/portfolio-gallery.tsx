'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../admin.module.css';

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  order?: number;
}

export default function PortfolioGalleryAdmin() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadLockRef = useRef(false);

  const fetchPhotos = async () => {
    try {
      const res = await fetch('/api/portfolio');
      const data = await res.json();
      const list = (data.photos || []) as Photo[];
      setPhotos([...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleFiles = async (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      fileArray.forEach((f) => formData.append('photos', f));
      const res = await fetch('/api/portfolio/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setPhotos(
          [...(data.photos || [])].sort((a: Photo, b: Photo) => (a.order ?? 0) - (b.order ?? 0))
        );
      }
    } catch (e) {
      console.error(e);
      alert('Upload failed.');
    } finally {
      uploadLockRef.current = false;
      setUploading(false);
    }
  };

  const movePhoto = async (index: number, delta: number) => {
    const sorted = [...photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const j = index + delta;
    if (j < 0 || j >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[j]] = [next[j], next[index]];
    const orderedPhotoIds = next.map((p) => p.id);

    try {
      const res = await fetch('/api/portfolio/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedPhotoIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(
          [...(data.photos || [])].sort((a: Photo, b: Photo) => (a.order ?? 0) - (b.order ?? 0))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Remove this image from the main portfolio page?')) return;
    try {
      const res = await fetch(`/api/portfolio/photos/${photoId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setPhotos(
          [...(data.photos || [])].sort((a: Photo, b: Photo) => (a.order ?? 0) - (b.order ?? 0))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sortedPhotos = [...photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <>
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>MAIN PORTFOLIO GALLERY</span>
        <div className={styles.topBarActions}>
          <Link href="/admin" className={styles.topBarLink}>← Dashboard</Link>
          <Link href="/portfolio" className={styles.topBarLink} target="_blank" rel="noreferrer">
            View /portfolio →
          </Link>
        </div>
      </div>

      <div className={styles.container}>
        <p className={`${styles.sectionHint} ${styles.introBlock}`}>
          These images appear only on the main <strong>/portfolio</strong> page. Each
          project&apos;s page uses that place&apos;s own photos (edit places separately).
        </p>

        <div className={`${styles.formCard} ${styles.formCardFullWidth}`}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Add images</label>
            <div
              className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneDragOver : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <p className={styles.uploadZoneText}>
                {uploading ? 'Uploading…' : 'Drop images here or click to browse'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && void handleFiles(e.target.files)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Gallery order ({sortedPhotos.length} {sortedPhotos.length === 1 ? 'image' : 'images'})
            </label>
            <p className={styles.formHint}>
              #1 appears first on the portfolio grid. Use ↑ ↓ to change order.
            </p>

            {loading ? (
              <div className={styles.emptyState}>Loading…</div>
            ) : sortedPhotos.length === 0 ? (
              <div className={styles.emptyState}>No portfolio images yet. Upload above.</div>
            ) : (
              <div className={styles.photosGrid}>
                {sortedPhotos.map((photo, index) => (
                  <div key={photo.id} className={styles.photoItem}>
                    <div className={styles.photoItemHeader}>
                      <span className={styles.photoPriorityBadge}>#{index + 1}</span>
                      <div className={styles.photoOrderBtns}>
                        <button
                          type="button"
                          className={styles.photoOrderBtn}
                          onClick={() => movePhoto(index, -1)}
                          disabled={index === 0 || uploading}
                          aria-label="Higher priority"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={styles.photoOrderBtn}
                          onClick={() => movePhoto(index, 1)}
                          disabled={index === sortedPhotos.length - 1 || uploading}
                          aria-label="Lower priority"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    <Image
                      src={photo.thumbnail}
                      alt={photo.alt}
                      width={150}
                      height={150}
                      className={styles.photoItemImg}
                      style={{ objectFit: 'cover' }}
                    />
                    <div className={styles.photoItemOverlay}>
                      <button
                        type="button"
                        className={styles.photoDeleteBtn}
                        onClick={() => handleDelete(photo.id)}
                        disabled={uploading}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
