import { Profile } from '@/types';
import type { ActiveRide } from '@/api/rides';
import type { DriverProfile, RideRequest } from '@/api/driver';
import type { EarningsSummary, WithdrawalRequest } from '@/api/earnings';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// Token is set synchronously on every auth state change — avoids async
// getSession() timing issues when tabs mount after login.
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

function getHeaders(): Record<string, string> {
  if (!_accessToken) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${_accessToken}`, 'Content-Type': 'application/json' };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request failed: ${res.status}`);
  return json as T;
}

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

// ── Earnings ──────────────────────────────────────────────────────────────────

export const DriverEarningsAPI = {
  get: () =>
    request<{ rides: any[]; summary: EarningsSummary }>('GET', '/api/driver/earnings'),
  getToday: () =>
    request<{ amount: number; rides: number }>('GET', '/api/driver/earnings/today'),
  withdraw: (req: WithdrawalRequest) =>
    request<void>('POST', '/api/driver/earnings/withdraw', req),
};
