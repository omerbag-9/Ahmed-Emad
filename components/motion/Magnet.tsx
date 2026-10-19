'use client';

import { useEffect, useRef } from 'react';

/** ReactBits Magnet: the element leans toward the pointer while it hovers. Mouse only. */
export default function Magnet({
  children,
  strength = 0.3,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover: none)').matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.transition = 'transform 120ms linear';
      el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * strength}px, ${
        (e.clientY - (r.top + r.height / 2)) * strength
      }px)`;
    };
    const leave = () => {
      el.style.transition = 'transform 600ms cubic-bezier(.16,1,.3,1)';
      el.style.transform = '';
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [strength]);

  return (
    <span ref={ref} className={className} style={{ display: 'inline-flex' }}>
      {children}
    </span>
  );
}
