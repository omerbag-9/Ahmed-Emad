'use client';

import { useCallback, useRef, useState } from 'react';
import styles from './admin.module.css';

type Ask = { title: string; body: string; confirm: string };

/**
 * Styled confirm dialog in place of window.confirm(). `confirm()` resolves true or false;
 * render `dialog` once in the component.
 */
export function useConfirm() {
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);

  const confirm = useCallback((a: Ask) => {
    setAsk(a);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      requestAnimationFrame(() => {
        ref.current?.showModal();
        ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
      });
    });
  }, []);

  const close = (ok: boolean) => {
    ref.current?.close();
    resolver.current?.(ok);
    resolver.current = null;
  };

  const dialog = (
    <dialog
      ref={ref}
      className={styles.dialog}
      onCancel={() => {
        resolver.current?.(false);
        resolver.current = null;
      }}
      onClick={(e) => {
        if (e.target === ref.current) close(false);
      }}
    >
      {ask ? (
        <>
          <h2>{ask.title}</h2>
          <p>{ask.body}</p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.btn} onClick={() => close(false)}>
              Cancel
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => close(true)}>
              {ask.confirm}
            </button>
          </div>
        </>
      ) : null}
    </dialog>
  );

  return { confirm, dialog };
}
