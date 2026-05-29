import { supabase } from '@/lib/supabase';

export type AppRole = 'passenger' | 'driver' | 'admin' | 'partner' | 'investor';

// ── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ── Sign Up ──────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: fullName ? { data: { full_name: fullName } } : undefined,
  });
  if (error) throw error;
  return data;
}

// ── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Get current session ───────────────────────────────────────────────────────

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ── Get profile + role ───────────────────────────────────────────────────────

export async function getUserData(userId: string) {
  const [roleRes, profileRes] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
  ]);
  return {
    role: (roleRes.data?.role ?? null) as AppRole | null,
    profile: profileRes.data ?? null,
  };
}

// ── Update profile ───────────────────────────────────────────────────────────

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Request password reset ────────────────────────────────────────────────────

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
