'use client';

import Icon from '@/components/Icon';
import { copyText, spark, toast } from '@/lib/feedback';
import styles from './photo.module.css';

export default function CopyLinkButton() {
  return (
    <button
      type="button"
      className={styles.copy}
      onClick={async (e) => {
        await copyText(window.location.href);
        spark(e.clientX, e.clientY);
        toast('Link copied');
      }}
    >
      <Icon name="share" size={16} />
      Copy link
    </button>
  );
}
