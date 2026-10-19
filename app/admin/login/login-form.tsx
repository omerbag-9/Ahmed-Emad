'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { gallerySrcSet } from '@/lib/cloudinaryImage';
import styles from './login.module.css';

export default function LoginForm({ photo }: { photo?: { src: string; width: number; caption: string } }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const shake = () => {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      formRef.current?.animate(
        [{ transform: 'none' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }],
        { duration: 320 }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      document.getElementById(username.trim() ? 'login-password' : 'login-username')?.focus();
      shake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push('/admin');
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || 'That username and password do not match.');
      shake();
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.pic} aria-hidden={!photo}>
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- responsive Cloudinary srcset */}
            <img src={photo.src} srcSet={gallerySrcSet(photo.src, photo.width)} sizes="50vw" alt="" />
            <p>{photo.caption}</p>
          </>
        ) : null}
      </div>
      <div className={styles.side}>
        <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
          <Link href="/" className={styles.lockup} aria-label="Back to the site">
            <span className={styles.lockupName}>
              <span>AHMED</span>
              <span>EMAD</span>
            </span>
            <span className={styles.lockupTag}>PHOTOGRAPHS</span>
          </Link>
          <h1 className={styles.title}>Sign in to admin</h1>
          <p className={styles.sub}>Manage projects, the main portfolio and the about page.</p>

          <div className={styles.field}>
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="login-password">Password</label>
            <div className={styles.password}>
              <input
                id="login-password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
              >
                <Icon name={show ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>
          </div>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner} aria-hidden />
                Signing in
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
