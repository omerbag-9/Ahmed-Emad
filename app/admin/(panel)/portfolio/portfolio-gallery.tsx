'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { uploadPortfolioPhotosWithFallback } from '@/lib/adminCloudinaryUpload';
import PhotoManager, { type AdminPhoto } from '../../_components/PhotoManager';
import styles from '../../_components/admin.module.css';

type ApiPhoto = AdminPhoto & { order?: number };

const toAdmin = (list: ApiPhoto[]) =>
  [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(({ id, src, thumbnail, alt }) => ({ id, src, thumbnail, alt }));

export default function PortfolioGalleryAdmin({ initialPhotos }: { initialPhotos: AdminPhoto[] }) {
  const router = useRouter();

  const reload = useCallback(async () => {
    const res = await fetch('/api/portfolio', { cache: 'no-store' });
    const data = (await res.json()) as { photos?: ApiPhoto[] };
    router.refresh();
    return toAdmin(data.photos || []);
  }, [router]);

  const saveOrder = useCallback(
    async (orderedPhotoIds: string[]) => {
      const res = await fetch('/api/portfolio/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedPhotoIds }),
      });
      return res.ok;
    },
    []
  );

  const deletePhoto = useCallback(
    async (photoId: string, keepalive = false) => {
      const res = await fetch(`/api/portfolio/photos/${photoId}`, { method: 'DELETE', keepalive });
      if (res.ok && !keepalive) router.refresh();
      return res.ok;
    },
    [router]
  );

  const uploadFile = useCallback(async (file: File) => {
    const res = await uploadPortfolioPhotosWithFallback([file]);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || 'Upload failed');
    }
  }, []);

  return (
    <>
      <Link href="/admin" className={styles.crumb}>
        <Icon name="arrow-left" size={16} />
        Overview
      </Link>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Main portfolio</h1>
          <p className={styles.sub}>The photographs on /portfolio, in this order. Separate from each project’s own gallery.</p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.btn} href="/portfolio">
            <Icon name="external" size={16} />
            View on site
          </Link>
        </div>
      </div>
      <PhotoManager
        title="Photographs"
        hint="The first two rows are what visitors see before scrolling."
        initialPhotos={initialPhotos}
        saveOrder={saveOrder}
        deletePhoto={deletePhoto}
        uploadFile={uploadFile}
        reload={reload}
      />
    </>
  );
}
