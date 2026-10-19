'use client';

import { useEffect, useRef } from 'react';

/**
 * ReactBits AnimatedContent, ported without GSAP: the parts of a section rise into place in
 * reading order, once, as they scroll into view. `step` is the part's position in that order.
 * Content is visible in the server HTML; the hidden start state is only applied by script.
 */
export default function Reveal({
  children,
  step = 0,
  as: Tag = 'div',
  className,
  distance = 22,
}: {
  children: React.ReactNode;
  step?: number;
  as?: 'div' | 'section' | 'li' | 'figure' | 'p' | 'span' | 'blockquote' | 'ul';
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    // Already on screen at mount: animate now; otherwise wait until it scrolls in
    let anim: Animation | null = null;
    const play = () => {
      anim = el.animate(
        [
          { opacity: 0, transform: `translateY(${distance}px)` },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 800, delay: step * 80, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }
      );
    };
    if (r.top < innerHeight * 0.95) {
      play();
      return () => anim?.cancel();
    }
    el.style.opacity = '0';
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        el.style.opacity = '';
        play();
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.style.opacity = '';
      anim?.cancel();
    };
  }, [step, distance]);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
