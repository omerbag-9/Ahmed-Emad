'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './ProjectBriefReveal.module.css';

const PANEL_Z = 400;
const GAP = 9;

function useAllowHoverPopover(): boolean {
  const [allow, setAllow] = useState(false);
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 900px)');
    const coarse = window.matchMedia('(hover: none)');
    const apply = () => setAllow(!narrow.matches && !coarse.matches);
    apply();
    narrow.addEventListener('change', apply);
    coarse.addEventListener('change', apply);
    return () => {
      narrow.removeEventListener('change', apply);
      coarse.removeEventListener('change', apply);
    };
  }, []);
  return allow;
}

interface ProjectBriefRevealProps {
  brief: string;
  variant?: 'header' | 'meta';
}

export default function ProjectBriefReveal({ brief, variant = 'header' }: ProjectBriefRevealProps) {
  const id = useId();
  const panelId = `${id}-panel`;
  const triggerId = `${id}-trigger`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 352 });
  const allowHoverPopover = useAllowHoverPopover();

  const panelVisible = open || hoverOpen;

  const clearHoverTimer = useCallback(() => {
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxW = Math.min(352, window.innerWidth - 24);
    const w = variant === 'meta' ? Math.min(maxW, r.width) : maxW;
    const left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
    setPos({
      top: r.bottom + GAP,
      left,
      width: w,
    });
  }, [variant]);

  useLayoutEffect(() => {
    if (!panelVisible) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    const ro = new ResizeObserver(onScrollOrResize);
    if (triggerRef.current) ro.observe(triggerRef.current);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      ro.disconnect();
    };
  }, [panelVisible, updatePosition]);

  useEffect(() => {
    if (!panelVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setHoverOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelVisible]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer, true);
    return () => document.removeEventListener('pointerdown', onPointer, true);
  }, [open]);

  const scheduleHoverClose = useCallback(() => {
    if (!allowHoverPopover) return;
    clearHoverTimer();
    hoverLeaveTimer.current = setTimeout(() => setHoverOpen(false), 180);
  }, [allowHoverPopover, clearHoverTimer]);

  const onRootMouseEnter = () => {
    if (!allowHoverPopover) return;
    clearHoverTimer();
    setHoverOpen(true);
  };

  const onRootMouseLeave = () => {
    scheduleHoverClose();
  };

  const onPanelMouseEnter = () => {
    if (!allowHoverPopover) return;
    clearHoverTimer();
    setHoverOpen(true);
  };

  const onPanelMouseLeave = () => {
    scheduleHoverClose();
  };

  const panel = panelVisible ? (
    <div
      ref={panelRef}
      id={panelId}
      role="region"
      aria-labelledby={triggerId}
      className={styles.panelPortal}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: PANEL_Z,
      }}
      tabIndex={0}
      onMouseEnter={onPanelMouseEnter}
      onMouseLeave={onPanelMouseLeave}
    >
      <p className={styles.panelText}>{brief}</p>
    </div>
  ) : null;

  return (
    <>
      <div
        ref={rootRef}
        className={`${styles.root} ${styles[variant]} ${panelVisible ? styles.open : ''}`}
        onMouseEnter={onRootMouseEnter}
        onMouseLeave={onRootMouseLeave}
      >
        <button
          ref={triggerRef}
          type="button"
          id={triggerId}
          className={styles.trigger}
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={styles.triggerLabel}>In brief</span>
          <span className={styles.triggerIcon} aria-hidden>
            <svg className={styles.chevron} width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
