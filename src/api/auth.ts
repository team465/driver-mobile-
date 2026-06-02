import { supabase } from '@/lib/supabase';
import { DriverAuthAPI } from '@/lib/api';

export type AppRole = 'passenger' | 'driver' | 'admin' | 'partner' | 'investor';

// ── Auth — always direct Supabase ─────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: fullName ? { data: { full_name: fullName } } : undefined,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ── User data + profile via backend API ───────────────────────────────────────

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

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
