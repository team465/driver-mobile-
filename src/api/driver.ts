import { supabase } from '@/lib/supabase';

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

// ── Normalise vehicle type string for matching ────────────────────────────────
// Mirrors jihwolrd's normalizeVehicleType exactly.

export const normalizeVehicle = (v?: string | null): string =>
  (v ?? '').toLowerCase().replace(/[\s_-]+/g, '');

// ── Load driver profile ───────────────────────────────────────────────────────

export async function getDriverProfile(userId: string): Promise<DriverProfile | null> {
  const { data } = await supabase
    .from('driver_profiles' as any)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data as DriverProfile;

  // Auto-create profile from approved application (matches web behaviour)
  const { data: app } = await supabase
    .from('driver_applications')
    .select('vehicle_type, plate_number, vehicle_color, vehicle_brand, vehicle_model')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  if (!app) return null;

  const { data: newProfile } = await supabase
    .from('driver_profiles' as any)
    .insert({
      user_id:       userId,
      vehicle_type:  app.vehicle_type,
      plate_number:  app.plate_number,
      vehicle_color: app.vehicle_color,
      vehicle_brand: app.vehicle_brand,
      vehicle_model: app.vehicle_model,
    } as any)
    .select()
    .single();

  return (newProfile as DriverProfile) ?? null;
}

// ── Verification gate — mirrors web handleToggle checks ──────────────────────

export type VerificationError = 'not_verified' | 'license_expired' | 'vehicle_expired';

export function checkCanGoOnline(profile: DriverProfile): VerificationError | null {
  if (!profile.is_id_verified || !profile.is_license_verified || !profile.is_vehicle_verified) {
    return 'not_verified';
  }
  if (profile.license_expiry_date && new Date(profile.license_expiry_date) < new Date()) {
    return 'license_expired';
  }
  if (profile.vehicle_expiry_date && new Date(profile.vehicle_expiry_date) < new Date()) {
    return 'vehicle_expired';
  }
  return null;
}

// ── Online status ─────────────────────────────────────────────────────────────

export async function setOnlineStatus(userId: string, online: boolean): Promise<void> {
  const { error } = await supabase
    .from('driver_profiles' as any)
    .update({ is_online: online } as any)
    .eq('user_id', userId);
  if (error) throw error;
}

// ── Location update ───────────────────────────────────────────────────────────

export async function updateDriverLocation(
  userId: string,
  lat: number,
  lng: number
): Promise<void> {
  await supabase
    .from('driver_profiles' as any)
    .update({
      current_lat:           lat,
      current_lng:           lng,
      last_location_update:  new Date().toISOString(),
    } as any)
    .eq('user_id', userId);
}

// ── Active-ride flag ──────────────────────────────────────────────────────────

export async function setHasActiveRide(userId: string, value: boolean): Promise<void> {
  await supabase
    .from('driver_profiles' as any)
    .update({ has_active_ride: value } as any)
    .eq('user_id', userId);
}

// ── Credit earnings after ride completes ─────────────────────────────────────
// Matches the web's post-complete driver_profiles update exactly.

export async function creditDriverEarnings(userId: string, earnings: number): Promise<void> {
  const { data: dp } = await supabase
    .from('driver_profiles' as any)
    .select('total_earnings, total_rides, wallet_balance')
    .eq('user_id', userId)
    .single();

  if (!dp) return;

  await supabase
    .from('driver_profiles' as any)
    .update({
      total_earnings:  ((dp as any).total_earnings  || 0) + earnings,
      total_rides:     ((dp as any).total_rides     || 0) + 1,
      wallet_balance:  ((dp as any).wallet_balance  || 0) + earnings,
      has_active_ride: false,
    } as any)
    .eq('user_id', userId);
}

// ── Document expiry warnings ──────────────────────────────────────────────────
// Returns structured warnings; matches DriverDashboard + DriverRequestsTab logic.

export type ExpiryWarning = { label: string; level: 'expired' | 'soon' };

export function getExpiryWarnings(profile: DriverProfile): ExpiryWarning[] {
  const now      = new Date();
  const warnings: ExpiryWarning[] = [];

  const check = (dateStr: string | null, label: string) => {
    if (!dateStr) return;
    const d        = new Date(dateStr);
    const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft < 0)     warnings.push({ label: `${label} has expired`, level: 'expired' });
    else if (daysLeft <= 7) warnings.push({ label: `${label} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, level: 'soon' });
  };

  check(profile.license_expiry_date, 'License');
  check(profile.vehicle_expiry_date,  'Vehicle registration');
  return warnings;
}

// ── Pending ride snapshot ─────────────────────────────────────────────────────
// Mirrors loadPendingRideSnapshot — fetches pending rides, filters by vehicle
// type, sorts preferred-driver rides first.

export async function fetchPendingRides(
  driverVehicleType: string,
  driverUserId: string
): Promise<RideRequest[]> {
  const { data } = await supabase
    .from('rides' as any)
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(25);

  const normalized = normalizeVehicle(driverVehicleType);
  const matching   = ((data ?? []) as RideRequest[]).filter(
    r => normalizeVehicle(r.vehicle_type) === normalized
  );

  matching.sort((a, b) => {
    const aP = a.preferred_driver_id === driverUserId ? 1 : 0;
    const bP = b.preferred_driver_id === driverUserId ? 1 : 0;
    return bP - aP;
  });

  return matching;
}

// ── OSRM route coordinates ────────────────────────────────────────────────────
// Used for share-ride proximity checks (distanceToRoute).
// Mirrors the fetchFullRoute call in DriverActiveRideTab exactly.

export async function fetchRouteCoordinates(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): Promise<[number, number][] | null> {
  try {
    const res  = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    return (data.routes?.[0]?.geometry?.coordinates as [number, number][]) ?? null;
  } catch {
    return null;
  }
}
