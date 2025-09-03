'use server';

import { cookies } from 'next/headers';
import { sign } from '@/lib/auth';

// Use environment variable and provide a default for local development
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password'; 

export async function login(password: string) {
  if (password === ADMIN_PASSWORD) {
    const session = { loggedIn: true };
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const sessionToken = await sign(session, process.env.SESSION_SECRET as string);

    cookies().set('session', sessionToken, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    return { success: true };
  }
  return { success: false, error: 'Invalid password.' };
}

export async function logout() {
    cookies().set('session', '', { expires: new Date(0) });
}
