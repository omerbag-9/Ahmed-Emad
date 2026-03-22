import { NextResponse } from 'next/server';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const adminUsername = (process.env.ADMIN_USERNAME ?? 'admin').trim();
    const adminPassword = (process.env.ADMIN_PASSWORD ?? 'AhmedEmad@2002').trim();
    const inputUser = typeof username === 'string' ? username.trim() : '';
    const inputPass = typeof password === 'string' ? password.trim() : '';

    if (inputUser !== adminUsername) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Compare plain text password (for simplicity in dev)
    // In production, use ADMIN_PASSWORD_HASH env variable with bcrypt
    const isValid = inputPass === adminPassword;

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ username: inputUser });
    await setAuthCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
