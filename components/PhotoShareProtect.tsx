'use client';

import type { ReactNode } from 'react';

/**
 * Extra friction on the public /photo/[id] share page: blocks context menu and
 * drag on the image area. Does not stop network inspection or screenshots.
 */
export default function PhotoShareProtect({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={className}
      onContextMenu={(e) => e.preventDefault()}
      onContextMenuCapture={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
