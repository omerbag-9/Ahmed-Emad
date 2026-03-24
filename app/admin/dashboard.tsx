'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './admin.module.css';

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
}

interface Place {
  id: string;
  name: string;
  slug: string;
  location?: string;
  brief?: string;
  description?: string;
  coverImage: string;
  photos: Photo[];
  createdAt: string;
}

export default function AdminDashboard() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [portfolioGalleryCount, setPortfolioGalleryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [placesRes, portfolioRes] = await Promise.all([
        fetch('/api/places', { cache: 'no-store' }),
        fetch('/api/portfolio', { cache: 'no-store' }),
      ]);
      const data = await placesRes.json();
      const portfolioData = await portfolioRes.json();
      setPlaces(data.places || []);
      setPortfolioGalleryCount((portfolioData.photos || []).length);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all photos.`)) return;

    try {
      const res = await fetch(`/api/places/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPlaces(prev => prev.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const movePlace = async (index: number, delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= places.length) return;

    const reordered = [...places];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    const orderedPlaceIds = reordered.map((p) => p.id);

    try {
      const res = await fetch('/api/places', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedPlaceIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlaces(data.places || reordered);
      }
    } catch (error) {
      console.error('Failed to reorder places:', error);
    }
  };

  const totalPhotos = places.reduce((sum, p) => sum + p.photos.length, 0);

  return (
    <>
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>PORTFOLIO ADMIN</span>
        <div className={styles.topBarActions}>
          <Link href="/portfolio" className={styles.topBarLink}>View Site →</Link>
          <button onClick={handleLogout} className={styles.logoutBtn}>Sign Out</button>
        </div>
      </div>

      <div className={styles.container}>
        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Places</div>
            <div className={styles.statValue}>{places.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Main /portfolio images</div>
            <div className={styles.statValue}>{portfolioGalleryCount}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Photos in projects</div>
            <div className={styles.statValue}>{totalPhotos}</div>
          </div>
        </div>

        <div className={styles.sectionTitle}>
          <span>Main portfolio page</span>
          <Link href="/admin/portfolio" className={styles.addBtn}>
            Manage gallery →
          </Link>
        </div>
        <p className={styles.sectionHint}>
          Curate which images appear on <span className={styles.inlineCode}>/portfolio</span> and in
          what order. This is separate from each place&apos;s project gallery.
        </p>

        <div className={styles.sectionTitle}>
          <span>About page</span>
          <Link href="/admin/about" className={styles.addBtn}>
            Edit content →
          </Link>
        </div>
        <p className={styles.sectionHint}>
          Change the public <span className={styles.inlineCode}>/about</span> text and portrait
          photo.
        </p>

        {/* Places */}
        <div className={styles.sectionTitle}>
          <span>Places (projects)</span>
          <Link href="/admin/places/new" className={styles.addBtn}>
            + Add Place
          </Link>
        </div>
        <p className={styles.sectionHint}>
          Use ↑ ↓ to set the order of projects in the sidebar — not the main /portfolio grid.
        </p>

        {loading ? (
          <div className={styles.emptyState}>Loading...</div>
        ) : places.length === 0 ? (
          <div className={styles.emptyState}>
            No places yet. Click "Add Place" to get started.
          </div>
        ) : (
          <div className={styles.placesGrid}>
            {places.map((place, index) => {
              const blurbLine = place.brief?.trim() || place.description?.trim();
              const blurbShort =
                blurbLine && blurbLine.length > 130 ? `${blurbLine.slice(0, 127)}…` : blurbLine;
              return (
              <div key={place.id} className={styles.placeCard}>
                {place.coverImage ? (
                  <Image
                    src={place.coverImage}
                    alt={place.name}
                    width={400}
                    height={180}
                    className={styles.placeCardImage}
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className={styles.placeCardNoImage}>No photos</div>
                )}
                <div className={styles.placeCardBody}>
                  <div className={styles.placeCardName}>{place.name}</div>
                  <div className={styles.placeCardMeta}>
                    {place.location?.trim() ? `${place.location.trim()} · ` : ''}
                    {place.photos.length} photos · Order {index + 1}
                  </div>
                  {blurbLine ? (
                    <p className={styles.placeCardBlurb} title={blurbLine}>
                      {blurbShort}
                    </p>
                  ) : null}
                  <div className={styles.placeOrderRow}>
                    <button
                      type="button"
                      className={styles.orderBtn}
                      onClick={() => movePlace(index, -1)}
                      disabled={index === 0}
                      aria-label="Move project up in portfolio"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.orderBtn}
                      onClick={() => movePlace(index, 1)}
                      disabled={index === places.length - 1}
                      aria-label="Move project down in portfolio"
                    >
                      ↓
                    </button>
                  </div>
                  <div className={styles.placeCardActions}>
                    <Link href={`/admin/places/${place.id}/edit`} className={styles.editBtn}>Edit</Link>
                    <button
                      onClick={() => handleDelete(place.id, place.name)}
                      className={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </>
  );
}
