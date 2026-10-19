'use client';

import { useCallback, useState } from 'react';
import Icon from '@/components/Icon';
import { copyText, spark, toast } from '@/lib/feedback';
import styles from './PhotoShareButton.module.css';

export default function PhotoShareButton({
  photoId,
  className = '',
}: {
  photoId: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      await copyText(`${window.location.origin}/photo/${photoId}`);
      spark(e.clientX, e.clientY);
      toast('Link copied');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    },
    [photoId]
  );

  return (
    <button
      type="button"
      className={`${styles.btn} ${className}`.trim()}
      onClick={handleClick}
      aria-label={copied ? 'Link copied' : 'Copy link to this photo'}
    >
      <Icon name={copied ? 'check' : 'share'} size={16} />
    </button>
  );
}
