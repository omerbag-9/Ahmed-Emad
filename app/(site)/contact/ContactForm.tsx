'use client';

import { useCallback, useId, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import BlurText from '@/components/motion/BlurText';
import Reveal from '@/components/motion/Reveal';
import { siteContact, siteSocialLinks } from '@/lib/site';
import styles from './contact-form.module.css';

type Status = 'idle' | 'sending' | 'success' | 'error';
type Field = 'name' | 'email' | 'note';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function ContactForm() {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const trapRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const clearError = useCallback(
    (f: Field) => {
      setErrors((e) => (e[f] ? { ...e, [f]: undefined } : e));
      if (status === 'error') {
        setStatus('idle');
        setMessage('');
      }
    },
    [status]
  );

  function validate() {
    const next: Partial<Record<Field, string>> = {};
    if (!name.trim()) next.name = 'Please add your name.';
    if (!email.trim()) next.email = 'Please add your email.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'That email address looks incomplete.';
    if (!note.trim()) next.note = 'Tell us a little about the space.';
    setErrors(next);
    const first = (['name', 'email', 'note'] as Field[]).find((f) => next[f]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${formId}-${first}`)}`)?.focus();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        formRef.current?.animate(
          [{ transform: 'none' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }],
          { duration: 320, easing: 'ease-out' }
        );
      }
    }
    return !first;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending' || !validate()) return;
    setStatus('sending');
    setMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, note, _trap: trapRef.current?.value ?? '' }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setStatus('success');
      setMessage('Thank you, your message was sent. Ahmed will reply soon.');
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

  const instagram = siteSocialLinks.find((s) => s.id === 'instagram' && s.href?.trim());
  const igHandle = instagram ? `@${new URL(instagram.href).pathname.replace(/\//g, '')}` : '';

  const field = (f: Field | 'phone', label: string, input: React.ReactNode, full = false) => {
    const err = f !== 'phone' ? errors[f] : undefined;
    return (
      <div className={`${styles.field} ${full ? styles.fieldFull : ''}`} data-error={err ? 'true' : undefined}>
        <label htmlFor={`${formId}-${f}`}>{label}</label>
        {input}
        <span className={styles.error} id={`${formId}-${f}-err`} aria-live="polite">
          {err}
        </span>
      </div>
    );
  };
  const describedBy = (f: Field) => (errors[f] ? `${formId}-${f}-err` : undefined);

  return (
    <section className={styles.shell} aria-labelledby={`${formId}-title`}>
      <div className={styles.intro}>
        <h1 className={styles.title} id={`${formId}-title`}>
          <BlurText text="Contact" />
        </h1>
        <Reveal as="p" step={1} className={styles.tagline}>
          Bookings, collaborations and print requests. Send a note and Ahmed will reply as soon as he can.
        </Reveal>
        <Reveal as="ul" step={2} className={styles.list}>
          <li>
            <a href={`mailto:${siteContact.email}`}>
              <Icon name="mail" />
              <span>
                <small>Email</small>
                {siteContact.email}
              </span>
            </a>
          </li>
          <li>
            <a href={`tel:${siteContact.phone.replace(/\s/g, '')}`}>
              <Icon name="phone" />
              <span>
                <small>Phone</small>
                {siteContact.phone}
              </span>
            </a>
          </li>
          {instagram ? (
            <li>
              <a href={instagram.href} target="_blank" rel="noopener noreferrer">
                <Icon name="instagram" />
                <span>
                  <small>Instagram</small>
                  {igHandle}
                </span>
              </a>
            </li>
          ) : null}
        </Reveal>
      </div>

      <Reveal step={2} className={styles.panel}>
        <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={status === 'sending'}>
          <h2 className={styles.formTitle}>Send a message</h2>

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

          <div className={styles.grid}>
            {field(
              'name',
              'Name',
              <input
                id={`${formId}-name`}
                name="name"
                type="text"
                autoComplete="name"
                maxLength={200}
                value={name}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy('name')}
                onChange={(ev) => {
                  setName(ev.target.value);
                  clearError('name');
                }}
              />
            )}
            {field(
              'email',
              'Email',
              <input
                id={`${formId}-email`}
                name="email"
                type="email"
                autoComplete="email"
                maxLength={320}
                value={email}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy('email')}
                onChange={(ev) => {
                  setEmail(ev.target.value);
                  clearError('email');
                }}
              />
            )}
            {field(
              'phone',
              'Phone (optional)',
              <input
                id={`${formId}-phone`}
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={80}
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
              />,
              true
            )}
            {field(
              'note',
              'About the space',
              <textarea
                id={`${formId}-note`}
                name="note"
                maxLength={12000}
                rows={8}
                value={note}
                placeholder="What is the project, where is it, and when is it ready to photograph?"
                aria-invalid={Boolean(errors.note)}
                aria-describedby={describedBy('note')}
                onChange={(ev) => {
                  setNote(ev.target.value);
                  clearError('note');
                }}
              />,
              true
            )}
          </div>

          <div className={styles.foot}>
            <button type="submit" className={styles.submit} data-state={status}>
              {status === 'sending' ? 'Sending' : 'Send message'}
              <Icon name="arrow-right" size={16} />
              <span className={styles.bar} aria-hidden />
            </button>
            <p
              className={styles.feedback}
              role="status"
              aria-live="polite"
              data-visible={message ? 'true' : 'false'}
              data-tone={status === 'success' ? 'ok' : 'err'}
            >
              {status === 'success' ? <Icon name="check" size={16} /> : null}
              {message}
            </p>
          </div>
        </form>
      </Reveal>
    </section>
  );
}
