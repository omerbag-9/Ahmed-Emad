'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../../admin.module.css';

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  order?: number;
}

interface Place {
  id: string;
  name: string;
  category: string;
  location?: string;
  description: string;
  photos: Photo[];
}

export default function EditPlace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [place, setPlace] = useState<Place | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveLockRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch(`/api/places/${id}`).then(r => r.json()),
      fetch('/api/places').then(r => r.json()),
    ]).then(([placeData, allData]) => {
      setPlace(placeData);
      setName(placeData.name);
      setLocation(placeData.location || '');
      setCategory(placeData.category);
      setDescription(placeData.description || '');
      setCategories(allData.categories || []);
    });
  }, [id]);

  const handleFiles = (newFileList: FileList | File[]) => {
    const fileArray = Array.from(newFileList).filter(f => f.type.startsWith('image/'));
    setNewFiles(prev => [...prev, ...fileArray]);

    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) return;
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    setLoading(true);

    try {
      await fetch(`/api/places/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, description, location }),
      });

      // Upload new photos if any
      if (newFiles.length > 0) {
        setUploading(true);
        const formData = new FormData();
        formData.append('placeId', id);
        newFiles.forEach(file => formData.append('photos', file));

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error('Upload failed');
        setUploading(false);
      }

      router.push('/admin');
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update place.');
    } finally {
      saveLockRef.current = false;
      setUploading(false);
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return;

    try {
      const res = await fetch(`/api/places/${id}/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPlace(prev =>
          prev ? { ...prev, photos: prev.photos.filter(p => p.id !== photoId) } : null
        );
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  const movePhoto = async (sortedIndex: number, delta: number) => {
    if (!place) return;
    const sorted = [...place.photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const j = sortedIndex + delta;
    if (j < 0 || j >= sorted.length) return;

    const next = [...sorted];
    [next[sortedIndex], next[j]] = [next[j], next[sortedIndex]];
    const orderedPhotoIds = next.map((p) => p.id);

    try {
      const res = await fetch(`/api/places/${id}/photos/order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedPhotoIds }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlace(updated);
      }
    } catch (error) {
      console.error('Failed to reorder photos:', error);
    }
  };

  const sortedPhotos =
    place ? [...place.photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];

  if (!place) {
    return (
      <>
        <div className={styles.topBar}>
          <span className={styles.topBarTitle}>EDIT PLACE</span>
        </div>
        <div className={styles.container}>
          <div className={styles.emptyState}>Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>EDIT PLACE</span>
        <div className={styles.topBarActions}>
          <Link href="/admin" className={styles.topBarLink}>← Back to Dashboard</Link>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.formCard}>
          <form onSubmit={handleUpdate}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.formInput}
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
                placeholder="e.g., Cairo · New Cairo"
              />
              <p className={styles.formHint}>
                Appears under the name in the site sidebar.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={styles.formSelect}
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.formTextarea}
              />
            </div>

            {/* Existing Photos */}
            {place.photos.length > 0 && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Existing Photos ({place.photos.length})
                </label>
                <p className={styles.formHint}>
                  Priority 1 shows first on this project&apos;s pages (category view and project detail). Main /portfolio uses a separate gallery in admin.
                </p>
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
                            disabled={index === 0}
                            aria-label="Higher priority"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className={styles.photoOrderBtn}
                            onClick={() => movePhoto(index, 1)}
                            disabled={index === sortedPhotos.length - 1}
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
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add More Photos */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Add More Photos</label>
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
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                style={{ display: 'none' }}
              />

              {newPreviews.length > 0 && (
                <div className={styles.uploadPreview}>
                  {newPreviews.map((preview, i) => (
                    <div key={i} className={styles.uploadPreviewItem}>
                      <img src={preview} alt="" className={styles.uploadPreviewImage} />
                      <button
                        type="button"
                        className={styles.uploadPreviewRemove}
                        onClick={(e) => { e.stopPropagation(); removeNewFile(i); }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.submitBtn} disabled={loading || uploading}>
                {uploading ? 'Uploading photos...' : loading ? 'Saving...' : 'Save Changes'}
              </button>
              <Link href="/admin" className={styles.cancelBtn}>Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
