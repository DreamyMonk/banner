'use server';

import { login as authLogin, logout as authLogout } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function login(password: string) {
  const result = await authLogin(password);
  if (result.success) {
    // The redirect will happen on the client-side in the page component
    // after this action returns a success state.
    return { success: true };
  }
  return { success: false, error: result.error };
}

export async function logout() {
  await authLogout();
  redirect('/login');
}
