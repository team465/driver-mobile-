import { supabase } from '@/lib/supabase';
import { DriverRidesAPI } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ActiveRide {
  id: string;
  status: 'matched' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  passenger_id: string;
  driver_id: string;
  pickup_address: string | null;
  destination_address: string | null;
  pickup_lat: number;
  pickup_lng: number;
  destination_lat: number | null;
  destination_lng: number | null;
  stops: unknown[] | null;
  vehicle_type: string;
  ride_type: string | null;
  booking_type: string | null;
  estimated_fare: number;
  final_fare: number | null;
  agreed_price: number | null;
  offered_fare: number | null;
  hire_description: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  driver_earnings: number | null;
  shared_ride_group: string | null;
  remaining_seats: number | null;
  group_size: number | null;
  passenger_rating: number | null;
  passenger_review: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  [key: string]: unknown;
}

// ── Data operations via backend API ──────────────────────────────────────────

export async function getRide(rideId: string): Promise<ActiveRide | null> {
  try { return await DriverRidesAPI.getById(rideId); } catch { return null; }
}

export async function getGroupRides(sharedRideGroup: string): Promise<ActiveRide[]> {
  try { return await DriverRidesAPI.getGroup(sharedRideGroup); } catch { return []; }
}

export async function acceptRide(
  rideId: string, passengerId: string, _driverId: string,
  options?: { isFullDay?: boolean; offeredFare?: number }
): Promise<void> {
  await DriverRidesAPI.accept(rideId, passengerId, options);
}

export async function acceptShareRidePassenger(
  newRide: { id: string; passenger_id: string; group_size: number | null },
  currentGroupId: string, currentRemainingSeats: number, _driverId: string
): Promise<void> {
  await DriverRidesAPI.acceptShare(newRide.id, currentGroupId, currentRemainingSeats, newRide.group_size ?? 1);
}

export async function markArrived(ride: ActiveRide): Promise<void> {
  await DriverRidesAPI.markArrived(ride.id, ride.passenger_id);
}

export async function startRide(ride: ActiveRide): Promise<void> {
  await DriverRidesAPI.start(ride.id, ride.passenger_id);
}

export async function completeRide(ride: ActiveRide, _driverId: string): Promise<number> {
  const { earnings } = await DriverRidesAPI.complete(ride.id);
  return earnings;
}

export async function dropOffPassenger(passengerRide: ActiveRide): Promise<number> {
  const { earnings } = await DriverRidesAPI.dropOff(passengerRide.id);
  return earnings;
}

export async function cancelRideByDriver(rideId: string): Promise<void> {
  await DriverRidesAPI.cancel(rideId);
}

export async function submitPassengerRating(
  ride: ActiveRide, _driverId: string, rating: number, review?: string
): Promise<void> {
  await DriverRidesAPI.ratePassenger(ride.id, rating, review);
}

// ── Realtime subscriptions — always Supabase direct (WebSocket) ──────────────

export function subscribeToRide(
  rideId: string, channelId: string, onUpdate: (updated: ActiveRide) => void
) {
  return supabase
    .channel(channelId)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
      (payload: any) => onUpdate(payload.new as ActiveRide))
    .subscribe();
}

export function subscribeToGroupRides(
  groupId: string, channelId: string, onUpdate: (updated: ActiveRide) => void
) {
  return supabase
    .channel(channelId)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `shared_ride_group=eq.${groupId}` },
      (payload: any) => onUpdate(payload.new as ActiveRide))
    .subscribe();
}

export function subscribeToPendingRides(
  channelId: string, onInsert: (ride: any) => void, onStatusChange?: (status: string) => void
) {
  return supabase
    .channel(channelId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides', filter: 'status=eq.pending' },
      (payload: any) => onInsert(payload.new))
    .subscribe((status: string) => onStatusChange?.(status));
}

export function subscribeToShareRideInserts(channelId: string, onInsert: (ride: any) => void) {
  return supabase
    .channel(channelId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides' },
      (payload: any) => onInsert(payload.new))
    .subscribe();
}

export function removeChannel(channel: ReturnType<typeof supabase.channel>) {
  supabase.removeChannel(channel);
}
