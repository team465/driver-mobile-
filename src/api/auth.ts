import { supabase } from '@/lib/supabase';
import { AuthPublicAPI, DriverAuthAPI } from '@/lib/api';

export type AppRole = 'passenger' | 'driver' | 'admin' | 'partner' | 'investor';

// ── Sign In ───────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error('Please verify your email before signing in.');
  }
  return data;
}

// ── Sign Up (via backend → sends Resend verification email) ──────────────────

export async function signUp(
  email: string,
  password: string,
  fullName?: string,
  phone?: string,
): Promise<{ needsVerification: boolean }> {
  return AuthPublicAPI.signUp(fullName ?? '', email, password, phone);
}

// ── Email verification ────────────────────────────────────────────────────────

export async function verifyEmail(email: string, code: string) {
  return AuthPublicAPI.verifyEmail(email, code);
}

export async function resendVerification(email: string) {
  return AuthPublicAPI.resendVerification(email);
}

// ── Password reset ────────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string) {
  return AuthPublicAPI.forgotPassword(email);
}

export async function resetPasswordWithCode(email: string, code: string, password: string) {
  return AuthPublicAPI.resetPassword(email, code, password);
}

// ── Sign Out ──────────────────────────────────────────────────────────────────

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ── User data + profile via backend API ──────────────────────────────────────

export async function getUserData(_userId: string) {
  try {
    return await DriverAuthAPI.getUserData();
  } catch {
    return { role: null as AppRole | null, profile: null };
  }
}

export async function updateProfile(_userId: string, updates: Record<string, unknown>) {
  return DriverAuthAPI.updateProfile(updates);
}
