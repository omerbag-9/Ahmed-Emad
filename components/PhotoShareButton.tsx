'use client';

import { useCallback, useState } from 'react';
import styles from './PhotoShareButton.module.css';

type Variant = 'grid' | 'slider';

export default function PhotoShareButton({
  photoId,
  variant = 'grid',
  className = '',
}: {
  photoId: string;
  variant?: Variant;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const shareUrl = `${window.location.origin}/photo/${photoId}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    },
    [photoId]
  );

  return (
    <button
      type="button"
      className={`${styles.btn} ${variant === 'slider' ? styles.btnSlider : ''} ${className}`.trim()}
      onClick={handleClick}
      aria-label={copied ? 'Link copied' : 'Copy link to this photo'}
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
        </svg>
      )}
    </button>
  );
}
