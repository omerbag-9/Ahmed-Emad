'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { siteContact } from '@/lib/site';
import styles from './contact-form.module.css';

type Status = 'idle' | 'sending' | 'success' | 'error';

export default function ContactForm() {
  const formId = useId();
  const trapRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const resetFeedback = useCallback(() => {
    if (status === 'error') {
      setStatus('idle');
      setMessage('');
    }
  }, [status]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          note,
          _trap: trapRef.current?.value ?? '',
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Something went wrong.');
        return;
      }

      setStatus('success');
      setMessage('Thank you — your message was sent. We will get back to you soon.');
      setName('');
      setEmail('');
      setPhone('');
      setNote('');
      if (trapRef.current) trapRef.current.value = '';
    } catch {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  }

  const mailHref = `mailto:${siteContact.email}`;
  const telHref = `tel:${siteContact.phone.replace(/\s/g, '')}`;

  return (
    <div className={styles.shell}>
      <div className={styles.layout}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Get in touch</p>
          <h1 className={styles.title}>Contact</h1>
          <p className={styles.tagline}>
            Commissions, collaborations, print requests — send a note and we
            will reply as soon as we can.
          </p>
          <ul className={styles.contactList}>
            <li>
              <span className={styles.contactKey}>Email</span>
              <a href={mailHref} className={styles.contactValue}>
                {siteContact.email}
              </a>
            </li>
            <li>
              <span className={styles.contactKey}>Phone</span>
              <a href={telHref} className={styles.contactValue}>
                {siteContact.phone}
              </a>
            </li>
          </ul>
        </header>

        <div className={styles.formPanel}>
          <form
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
            aria-busy={status === 'sending'}
          >
            <p className={styles.formHeading}>Send a message</p>

            {/* Honeypot */}
            <input
              ref={trapRef}
              type="text"
              name="_trap"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
              className={styles.honeypot}
              aria-hidden
            />

            <div
              className={styles.feedback}
              role="status"
              aria-live="polite"
              data-visible={message ? 'true' : 'false'}
              data-tone={status === 'success' ? 'ok' : 'err'}
            >
              {message}
            </div>

            <div className={styles.formGrid}>
              <div className={styles.colStack}>
                <label className={styles.field} htmlFor={`${formId}-name`}>
                  <span className={styles.label}>Name</span>
                  <input
                    id={`${formId}-name`}
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={200}
                    value={name}
                    onChange={(ev) => {
                      setName(ev.target.value);
                      resetFeedback();
                    }}
                    className={styles.input}
                  />
                </label>
                <label className={styles.field} htmlFor={`${formId}-email`}>
                  <span className={styles.label}>Email</span>
                  <input
                    id={`${formId}-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={320}
                    value={email}
                    onChange={(ev) => {
                      setEmail(ev.target.value);
                      resetFeedback();
                    }}
                    className={styles.input}
                  />
                </label>
                <label className={styles.field} htmlFor={`${formId}-phone`}>
                  <span className={styles.label}>Phone</span>
                  <input
                    id={`${formId}-phone`}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={80}
                    value={phone}
                    onChange={(ev) => {
                      setPhone(ev.target.value);
                      resetFeedback();
                    }}
                    className={styles.input}
                  />
                </label>
              </div>

              <label
                className={`${styles.field} ${styles.fieldGrow}`}
                htmlFor={`${formId}-note`}
              >
                <span className={styles.label}>Note</span>
                <textarea
                  id={`${formId}-note`}
                  name="note"
                  required
                  maxLength={12000}
                  rows={10}
                  value={note}
                  onChange={(ev) => {
                    setNote(ev.target.value);
                    resetFeedback();
                  }}
                  className={styles.textarea}
                />
              </label>
            </div>

            <button
              type="submit"
              className={styles.submit}
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
