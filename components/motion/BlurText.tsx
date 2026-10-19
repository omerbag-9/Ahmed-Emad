'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * ReactBits BlurText, ported without `motion`: words arrive one after another from a soft blur.
 * Server-rendered text stays readable without script; reduced motion skips the effect.
 */
export default function BlurText({
  text,
  as: Tag = 'span',
  className,
  delay = 70,
  start = 120,
}: {
  text: string;
  as?: 'span' | 'h1' | 'h2' | 'p';
  className?: string;
  /** ms between words */
  delay?: number;
  /** ms before the first word */
  start?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const anims = Array.from(el.querySelectorAll<HTMLElement>('[data-w]')).map((w, i) =>
      w.animate(
        [
          { filter: 'blur(10px)', opacity: 0, transform: 'translateY(-10px)' },
          { filter: 'blur(0)', opacity: 1, transform: 'none' },
        ],
        { duration: 700, delay: start + i * delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }
      )
    );
    return () => anims.forEach((a) => a.cancel());
  }, [text, delay, start]);

  const words = text.trim().split(/\s+/);
  return (
    <Tag ref={ref as never} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden data-w style={{ display: 'inline-block', whiteSpace: 'pre' }}>
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
