import { supabase } from '@/lib/supabase';
import type { ActiveRide } from '@/api/rides';
import type { DriverProfile, RideRequest } from '@/api/driver';
import type { EarningsSummary, WithdrawalRequest } from '@/api/earnings';

interface Profile { id: string; full_name: string | null; email: string | null; [key: string]: unknown; }

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// Keep a cached token for synchronous access — updated on every auth state change
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  // Use cached token first (fast), fall back to getSession() to get a fresh one
  const token = _accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function publicRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); }
  catch { throw new Error(`Backend unreachable (${res.status})`); }
  if (!res.ok) throw new Error(json.error ?? `Request failed: ${res.status}`);
  return json as T;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); }
  catch { throw new Error(`Backend unreachable (${res.status})`); }
  if (!res.ok) throw new Error(json.error ?? `Request failed: ${res.status}`);
  return json as T;
}

// ── Auth (public — no token required) ────────────────────────────────────────

export const AuthPublicAPI = {
  signUp: (full_name: string, email: string, password: string, phone?: string) =>
    publicRequest<{ success: boolean; needsVerification: boolean }>('POST', '/api/auth/signup', { full_name, email, password, phone }),
  verifyEmail: (email: string, code: string) =>
    publicRequest<{ success: boolean }>('POST', '/api/auth/verify-email', { email, code }),
  resendVerification: (email: string) =>
    publicRequest<{ success: boolean }>('POST', '/api/auth/resend-verification', { email }),
  forgotPassword: (email: string) =>
    publicRequest<{ success: boolean }>('POST', '/api/auth/forgot-password', { email }),
  resetPassword: (email: string, code: string, password: string) =>
    publicRequest<{ success: boolean }>('POST', '/api/auth/reset-password', { email, code, password }),
};

// ── Driver Profile ────────────────────────────────────────────────────────────

export const DriverProfileAPI = {
  get: () =>
    request<DriverProfile>('GET', '/api/driver/profile'),
  update: (updates: Record<string, unknown>) =>
    request<DriverProfile>('PUT', '/api/driver/profile', updates),
  setOnline: (online: boolean) =>
    request<void>('PATCH', '/api/driver/profile/online', { online }),
  setLocation: (lat: number, lng: number) =>
    request<void>('PATCH', '/api/driver/profile/location', { lat, lng }),
  setActiveRide: (value: boolean) =>
    request<void>('PATCH', '/api/driver/profile/active-ride', { value }),
  creditEarnings: (earnings: number) =>
    request<void>('POST', '/api/driver/profile/earnings', { earnings }),
};

// ── Auth / User data ──────────────────────────────────────────────────────────

export const DriverAuthAPI = {
  getUserData: () =>
    request<{ role: string | null; profile: Profile | null }>('GET', '/api/driver/auth/user-data'),
  updateProfile: (updates: Record<string, unknown>) =>
    request<Profile>('PUT', '/api/driver/profile', updates),
};

// ── Rides ─────────────────────────────────────────────────────────────────────

export const DriverRidesAPI = {
  getPending: () =>
    request<RideRequest[]>('GET', '/api/driver/rides/pending'),
  getById: (rideId: string) =>
    request<ActiveRide | null>('GET', `/api/driver/rides/${rideId}`),
  getGroup: (groupId: string) =>
    request<ActiveRide[]>('GET', `/api/driver/rides/group/${groupId}`),
  accept: (rideId: string, passengerId: string, opts?: { isFullDay?: boolean; offeredFare?: number }) =>
    request<void>('POST', `/api/driver/rides/${rideId}/accept`, { passengerId, ...opts }),
  acceptShare: (rideId: string, currentGroupId: string, currentRemainingSeats: number, newGroupSize: number) =>
    request<void>('POST', `/api/driver/rides/${rideId}/accept-share`, { currentGroupId, currentRemainingSeats, newGroupSize }),
  markArrived: (rideId: string, passengerId: string) =>
    request<void>('PATCH', `/api/driver/rides/${rideId}/arrived`, { passengerId }),
  start: (rideId: string, passengerId: string) =>
    request<void>('PATCH', `/api/driver/rides/${rideId}/start`, { passengerId }),
  complete: (rideId: string) =>
    request<{ earnings: number }>('PATCH', `/api/driver/rides/${rideId}/complete`),
  dropOff: (rideId: string) =>
    request<{ earnings: number }>('PATCH', `/api/driver/rides/${rideId}/dropoff`),
  cancel: (rideId: string) =>
    request<void>('PATCH', `/api/driver/rides/${rideId}/cancel`),
  ratePassenger: (rideId: string, rating: number, review?: string) =>
    request<void>('PATCH', `/api/driver/rides/${rideId}/rate-passenger`, { rating, review }),
};

// ── Support ───────────────────────────────────────────────────────────────────

export const DriverSupportAPI = {
  submit: (subject: string, category: string, message: string) =>
    request<{ id: string }>('POST', '/api/support', { subject, category, message }),
};

// ── Earnings ──────────────────────────────────────────────────────────────────

export const DriverEarningsAPI = {
  get: () =>
    request<{ rides: any[]; summary: EarningsSummary }>('GET', '/api/driver/earnings'),
  getToday: () =>
    request<{ amount: number; rides: number }>('GET', '/api/driver/earnings/today'),
  withdraw: (req: WithdrawalRequest) =>
    request<void>('POST', '/api/driver/earnings/withdraw', req),
};
