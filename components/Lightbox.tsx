'use client';

import { useEffect, useCallback, useState } from 'react';
import Image from 'next/image';
import styles from './Lightbox.module.css';

interface Photo {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ photos, currentIndex, onClose, onNavigate }: LightboxProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setIsAnimating(true));
    const timer = setTimeout(() => setIsAnimating(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        if (currentIndex > 0) onNavigate(currentIndex - 1);
        break;
      case 'ArrowRight':
        if (currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
        break;
    }
  }, [currentIndex, photos.length, onClose, onNavigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleShare = async () => {
    const photo = photos[currentIndex];
    const shareUrl = `${window.location.origin}/photo/${photo.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const photo = photos[currentIndex];
  if (!photo) return null;

  return (
    <div
      className={`${styles.lightbox} ${!isAnimating ? styles.visible : ''}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={styles.backdrop} onClick={onClose} />
      
      <div className={styles.content}>
        <div className={`${styles.imageContainer} noImageSave`}>
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            quality={90}
            priority
            className={styles.image}
            sizes="100vw"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
          {/* Transparent overlay to prevent right-click save */}
          <div className={styles.imageProtect} />
          {/* Share button inside photo */}
          <button className={styles.shareBtn} onClick={handleShare} aria-label="Share photo">
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      {currentIndex > 0 && (
        <button
          className={`${styles.navBtn} ${styles.prevBtn}`}
          onClick={() => onNavigate(currentIndex - 1)}
          aria-label="Previous photo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      
      {currentIndex < photos.length - 1 && (
        <button
          className={`${styles.navBtn} ${styles.nextBtn}`}
          onClick={() => onNavigate(currentIndex + 1)}
          aria-label="Next photo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Close button */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close lightbox">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      <div className={styles.counter}>
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
}
