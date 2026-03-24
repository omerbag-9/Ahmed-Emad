'use client';

import ProjectBriefReveal from '@/components/ProjectBriefReveal';
import styles from './ProjectGalleryMeta.module.css';

export interface GalleryProjectMeta {
  title: string;
  photoCount: number;
  brief?: string;
  description?: string;
}

interface ProjectGalleryMetaProps {
  meta: GalleryProjectMeta;
}

export default function ProjectGalleryMeta({ meta }: ProjectGalleryMetaProps) {
  const { title, photoCount, brief, description } = meta;
  const hasCopy = Boolean((brief && brief.trim()) || (description && description.trim()));

  return (
    <header
      className={`${styles.root} ${!hasCopy ? styles.noDesktopCopy : ''}`}
      aria-label="Project details"
    >
      <div className={styles.mobileTitle}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.count}>
          {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
        </p>
      </div>

      {hasCopy ? (
        <div className={styles.copy}>
          {brief?.trim() ? (
            <div className={styles.briefSlot}>
              <ProjectBriefReveal brief={brief.trim()} variant="meta" />
            </div>
          ) : null}
          {description?.trim() ? (
            <p className={styles.description}>{description.trim()}</p>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
