'use client';

import { useEffect } from 'react';
import styles from './admin.module.css';

/**
 * Rises from the bottom only while a form differs from what is saved.
 * Also warns before leaving the page with unsaved changes.
 */
export default function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  label = 'Save changes',
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  label?: string;
}) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  const on = dirty || saving;
  return (
    <div className={`${styles.saveBar} ${on ? styles.saveBarOn : ''}`} role="region" aria-label="Unsaved changes" inert={!on}>
      <span>
        <i aria-hidden />
        Unsaved changes
      </span>
      <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onDiscard} disabled={saving}>
        Discard
      </button>
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSave} disabled={saving}>
        {saving ? (
          <>
            <span className={styles.spinner} aria-hidden />
            Saving
          </>
        ) : (
          label
        )}
      </button>
    </div>
  );
}
