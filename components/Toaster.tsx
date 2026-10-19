'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { subscribeToasts, type ToastMessage } from '@/lib/feedback';
import styles from './Toaster.module.css';

/** Renders messages sent with `toast()` from anywhere on the page. Mounted once in the root layout. */
export default function Toaster() {
  const [msg, setMsg] = useState<ToastMessage | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeToasts((m) => {
    setMsg(m);
    setOpen(Boolean(m));
  }), []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setOpen(false), msg.duration);
    return () => clearTimeout(t);
  }, [msg]);

  return (
    <div className={`${styles.toast} ${open ? styles.on : ''}`} role="status" aria-live="polite">
      {msg ? (
        <>
          <Icon name="check" size={16} />
          <span>{msg.text}</span>
          {msg.action ? (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                msg.action?.onClick();
                setOpen(false);
              }}
            >
              {msg.action.label}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
