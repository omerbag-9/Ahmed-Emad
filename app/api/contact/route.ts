import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

const DEFAULT_TO = 'ahmedemad.v0@gmail.com';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;

  if (typeof o._trap === 'string' && o._trap.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 200) : '';
  const email = typeof o.email === 'string' ? o.email.trim().slice(0, 320) : '';
  const phone = typeof o.phone === 'string' ? o.phone.trim().slice(0, 80) : '';
  const note = typeof o.note === 'string' ? o.note.trim().slice(0, 12000) : '';

  if (!name || !email || !note) {
    return NextResponse.json(
      { error: 'Name, email, and your message are required.' },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const smtpUser = process.env.SMTP_USER?.trim();
  // Gmail app passwords are often shown with spaces; SMTP expects 16 chars without spaces
  const smtpPass = process.env.SMTP_PASS?.replace(/\s/g, '').trim();
  if (!smtpUser || !smtpPass) {
    return NextResponse.json(
      {
        error:
          'Email is not configured. Add SMTP_USER and SMTP_PASS to .env.local (see env.example — Gmail uses an app password).',
      },
      { status: 503 },
    );
  }

  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const portRaw = process.env.SMTP_PORT?.trim();
  const port = portRaw ? Number(portRaw) : 587;
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return NextResponse.json(
      { error: 'Invalid SMTP_PORT in environment.' },
      { status: 500 },
    );
  }

  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === 'true' || secureEnv === '1'
      ? true
      : secureEnv === 'false' || secureEnv === '0'
        ? false
        : port === 465;

  const useGmailPreset =
    !process.env.SMTP_HOST?.trim() || host === 'smtp.gmail.com';

  const to = (process.env.CONTACT_EMAIL_TO ?? DEFAULT_TO).trim() || DEFAULT_TO;
  const from =
    process.env.SMTP_FROM?.trim() || `Ahmed Emad Photographs <${smtpUser}>`;

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || '—'}`,
    '',
    note,
  ].join('\n');

  const html = `
    <p><strong>Name</strong><br/>${escapeHtml(name)}</p>
    <p><strong>Email</strong><br/><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
    <p><strong>Phone</strong><br/>${escapeHtml(phone || '—')}</p>
    <p><strong>Message</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(note)}</p>
  `;

  try {
    const transporter = useGmailPreset
      ? nodemailer.createTransport({
          service: 'gmail',
          auth: { user: smtpUser, pass: smtpPass },
        })
      : nodemailer.createTransport({
          host,
          port,
          secure,
          requireTLS: !secure && port === 587,
          auth: { user: smtpUser, pass: smtpPass },
        });

    await transporter.sendMail({
      from,
      to,
      replyTo: email,
      subject: 'New Inquiry from Portfolio Website',
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[contact]', err.message, err);

    const debug =
      process.env.NODE_ENV !== 'production' &&
      process.env.SMTP_DEBUG === '1';
    const hint = debug ? ` (${err.message})` : '';

    return NextResponse.json(
      {
        error: `Could not send your message. Check SMTP_USER / SMTP_PASS (Gmail: App Password, 2FA on) and restart the dev server.${hint}`,
      },
      { status: 502 },
    );
  }
}
