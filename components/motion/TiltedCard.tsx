'use client';

import { useEffect, useRef } from 'react';

/**
 * ReactBits TiltedCard, ported without `motion`: the element turns toward the pointer in 3D while
 * it hovers and eases back flat when it leaves. Mouse only; reduced motion keeps it flat.
 */
export default function TiltedCard({
  children,
  className,
  amplitude = 6,
  scaleOnHover = 1.02,
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Largest turn in degrees, at the card's edge */
  amplitude?: number;
  scaleOnHover?: number;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover: none)').matches) return;

    /* A critically damped follow stands in for motion's spring */
    const cur = { rx: 0, ry: 0, s: 1 };
    const goal = { rx: 0, ry: 0, s: 1 };
    let raf: number | null = null;
    const tick = () => {
      cur.rx += (goal.rx - cur.rx) * 0.14;
      cur.ry += (goal.ry - cur.ry) * 0.14;
      cur.s += (goal.s - cur.s) * 0.14;
      el.style.transform = `rotateX(${cur.rx.toFixed(3)}deg) rotateY(${cur.ry.toFixed(3)}deg) scale(${cur.s.toFixed(4)})`;
      const settled =
        Math.abs(goal.rx - cur.rx) < 0.01 && Math.abs(goal.ry - cur.ry) < 0.01 && Math.abs(goal.s - cur.s) < 0.0005;
      raf = settled ? null : requestAnimationFrame(tick);
    };
    const kick = () => {
      if (raf == null) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const ox = (e.clientX - r.left) / r.width - 0.5;
      const oy = (e.clientY - r.top) / r.height - 0.5;
      goal.rx = -oy * 2 * amplitude;
      goal.ry = ox * 2 * amplitude;
      goal.s = scaleOnHover;
      kick();
    };
    const onLeave = () => {
      goal.rx = 0;
      goal.ry = 0;
      goal.s = 1;
      kick();
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.transform = '';
    };
  }, [amplitude, scaleOnHover, disabled]);

  return (
    <div ref={ref} className={className} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
      {children}
    </div>
  );
}
