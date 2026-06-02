import { DriverProfileAPI, DriverRidesAPI } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DriverProfile {
  user_id: string;
  vehicle_type: string;
  plate_number: string | null;
  vehicle_color: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  is_online: boolean;
  has_active_ride: boolean;
  is_id_verified: boolean;
  is_license_verified: boolean;
  is_vehicle_verified: boolean;
  license_expiry_date: string | null;
  vehicle_expiry_date: string | null;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
  wallet_balance: number;
  total_earnings: number;
  total_rides: number;
  total_withdrawn: number;
  [key: string]: unknown;
}

export interface RideRequest {
  id: string;
  pickup_address: string;
  destination_address: string | null;
  pickup_lat: number;
  pickup_lng: number;
  destination_lat: number | null;
  destination_lng: number | null;
  stops: unknown[];
  vehicle_type: string;
  estimated_fare: number;
  distance_km: number;
  duration_minutes: number;
  passenger_id: string;
  status: string;
  ride_type: string | null;
  booking_type: string | null;
  offered_fare: number | null;
  hire_description: string | null;
  preferred_driver_id: string | null;
  scheduled_datetime: string | null;
  group_size: number | null;
  shared_ride_group: string | null;
  remaining_seats: number | null;
}

export const normalizeVehicle = (v?: string | null): string =>
  (v ?? '').toLowerCase().replace(/[\s_-]+/g, '');

// ── All data operations via backend API ───────────────────────────────────────

export async function getDriverProfile(_userId: string): Promise<DriverProfile | null> {
  try { return await DriverProfileAPI.get(); } catch { return null; }
}

export type VerificationError = 'not_verified' | 'license_expired' | 'vehicle_expired';

export function checkCanGoOnline(profile: DriverProfile): VerificationError | null {
  if (!profile.is_id_verified || !profile.is_license_verified || !profile.is_vehicle_verified)
    return 'not_verified';
  if (profile.license_expiry_date && new Date(profile.license_expiry_date) < new Date())
    return 'license_expired';
  if (profile.vehicle_expiry_date && new Date(profile.vehicle_expiry_date) < new Date())
    return 'vehicle_expired';
  return null;
}

export async function setOnlineStatus(_userId: string, online: boolean): Promise<void> {
  await DriverProfileAPI.setOnline(online);
}

export async function updateDriverLocation(_userId: string, lat: number, lng: number): Promise<void> {
  await DriverProfileAPI.setLocation(lat, lng);
}

export async function setHasActiveRide(_userId: string, value: boolean): Promise<void> {
  await DriverProfileAPI.setActiveRide(value);
}

export async function creditDriverEarnings(_userId: string, earnings: number): Promise<void> {
  await DriverProfileAPI.creditEarnings(earnings);
}

export type ExpiryWarning = { label: string; level: 'expired' | 'soon' };

export function getExpiryWarnings(profile: DriverProfile): ExpiryWarning[] {
  const now = new Date();
  const warnings: ExpiryWarning[] = [];
  const check = (dateStr: string | null, label: string) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft < 0) warnings.push({ label: `${label} has expired`, level: 'expired' });
    else if (daysLeft <= 7) warnings.push({ label: `${label} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, level: 'soon' });
  };
  check(profile.license_expiry_date, 'License');
  check(profile.vehicle_expiry_date, 'Vehicle registration');
  return warnings;
}

export async function fetchPendingRides(_vehicleType: string, _userId: string): Promise<RideRequest[]> {
  try { return await DriverRidesAPI.getPending(); } catch { return []; }
}

// OSRM route (third-party, stays direct — no backend needed)
export async function fetchRouteCoordinates(
  fromLng: number, fromLat: number, toLng: number, toLat: number
): Promise<[number, number][] | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    return (data.routes?.[0]?.geometry?.coordinates as [number, number][]) ?? null;
  } catch { return null; }
}
