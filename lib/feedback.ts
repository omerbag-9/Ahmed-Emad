'use client';

/**
 * Small feedback helpers shared by the site and the admin:
 * - `spark`: ReactBits ClickSpark, short lines bursting from a click point
 * - `toast`: one message at a time, optionally with an action (e.g. Undo)
 * - `copyText`: clipboard with the old execCommand fallback
 */

export function spark(x: number, y: number) {
  if (typeof document === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('i');
    const a = (i / 8) * 360;
    Object.assign(s.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: '10px',
      height: '2px',
      background: 'var(--text-primary)',
      pointerEvents: 'none',
      transformOrigin: 'left center',
      zIndex: '300',
    });
    document.body.appendChild(s);
    s.animate(
      [
        { transform: `rotate(${a}deg) translateX(4px) scaleX(1)`, opacity: 1 },
        { transform: `rotate(${a}deg) translateX(22px) scaleX(0)`, opacity: 0 },
      ],
      { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' }
    ).onfinish = () => s.remove();
  }
}

export type ToastAction = { label: string; onClick: () => void };
export type ToastMessage = { id: number; text: string; action?: ToastAction; duration: number };

type Listener = (t: ToastMessage | null) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function toast(text: string, action?: ToastAction) {
  const msg: ToastMessage = { id: ++seq, text, action, duration: action ? 5000 : 1800 };
  listeners.forEach((l) => l(msg));
}

export function subscribeToasts(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}
