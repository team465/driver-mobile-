import { supabase } from '@/lib/supabase';
import { creditDriverEarnings, setHasActiveRide } from './driver';

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

// ── Load a single ride ────────────────────────────────────────────────────────

export async function getRide(rideId: string): Promise<ActiveRide | null> {
  const { data } = await supabase
    .from('rides' as any)
    .select('*')
    .eq('id', rideId)
    .single();
  return (data as ActiveRide) ?? null;
}

// ── Fetch group rides for a share ride ────────────────────────────────────────

export async function getGroupRides(sharedRideGroup: string): Promise<ActiveRide[]> {
  const { data } = await supabase
    .from('rides' as any)
    .select('*')
    .eq('shared_ride_group', sharedRideGroup);
  return (data as ActiveRide[]) ?? [];
}

// ── Accept a ride request ─────────────────────────────────────────────────────
// passengerId must be passed from the caller — never re-fetch it here.

export async function acceptRide(
  rideId: string,
  passengerId: string,
  driverId: string,
  options?: { isFullDay?: boolean; offeredFare?: number }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    driver_id: driverId,
    status: 'matched',
  };
  if (options?.isFullDay) {
    updateData.agreed_price = options.offeredFare;
    updateData.negotiation_status = 'agreed';
  }

  const { error } = await supabase
    .from('rides' as any)
    .update(updateData)
    .eq('id', rideId)
    .eq('status', 'pending');
  if (error) throw error;

  await setHasActiveRide(driverId, true);

  await supabase.from('notifications').insert({
    user_id: passengerId,
    title: 'Driver Found!',
    message: 'Your driver is on the way!',
    type: 'ride_matched',
  });
}

// ── Accept a share-ride passenger mid-trip (ShareRidePopup logic) ─────────────
// Mirrors ShareRidePopup.handleAccept exactly.

export async function acceptShareRidePassenger(
  newRide: { id: string; passenger_id: string; group_size: number | null },
  currentGroupId: string,
  currentRemainingSeats: number,
  driverId: string
): Promise<void> {
  const seatsNeeded  = newRide.group_size ?? 1;
  const newRemaining = Math.max(currentRemainingSeats - seatsNeeded, 0);

  // Assign driver + link to the existing shared group
  const { error } = await supabase
    .from('rides' as any)
    .update({
      driver_id:         driverId,
      status:            'matched',
      shared_ride_group: currentGroupId,
      remaining_seats:   newRemaining,
    } as any)
    .eq('id', newRide.id);
  if (error) throw error;

  // Keep remaining_seats in sync across the whole group
  await supabase
    .from('rides' as any)
    .update({ remaining_seats: newRemaining } as any)
    .eq('shared_ride_group', currentGroupId);

  await supabase.from('notifications').insert({
    user_id: newRide.passenger_id,
    title:   'Driver Found!',
    message: 'A driver on a share ride has accepted your request!',
    type:    'ride_matched',
  });
}

// ── Driver arrived at pickup ──────────────────────────────────────────────────

export async function markArrived(ride: ActiveRide): Promise<void> {
  await supabase
    .from('rides' as any)
    .update({ status: 'arrived', arrived_at: new Date().toISOString() } as any)
    .eq('id', ride.id);

  await supabase.from('notifications').insert({
    user_id: ride.passenger_id,
    title:   'Driver Arrived',
    message: 'Your driver has arrived at the pickup location!',
    type:    'driver_arrived',
  });
}

// ── Start ride ────────────────────────────────────────────────────────────────

export async function startRide(ride: ActiveRide): Promise<void> {
  await supabase
    .from('rides' as any)
    .update({ status: 'in_progress', started_at: new Date().toISOString() } as any)
    .eq('id', ride.id);

  await supabase.from('notifications').insert({
    user_id: ride.passenger_id,
    title:   'Ride Started',
    message: 'Your ride has started. Enjoy!',
    type:    'ride_started',
  });
}

// ── Complete ride (single / private) ─────────────────────────────────────────

export async function completeRide(
  ride: ActiveRide,
  driverId: string
): Promise<number> {
  const isFullDay = ride.booking_type === 'full_day';
  const fare      = isFullDay
    ? (ride.agreed_price ?? ride.offered_fare ?? 0)
    : (ride.estimated_fare ?? 0);
  const earnings  = parseFloat((fare * 0.9).toFixed(2));

  const { error } = await supabase
    .from('rides' as any)
    .update({
      status:          'completed',
      completed_at:    new Date().toISOString(),
      final_fare:      fare,
      driver_earnings: earnings,
    } as any)
    .eq('id', ride.id)
    .in('status', ['in_progress']);
  if (error) throw new Error('Ride already cancelled by passenger.');

  await supabase.from('notifications' as any).insert({
    user_id:  ride.passenger_id,
    title:    'Trip Completed',
    message:  'Your trip has been completed. Thank you for riding with Jih!',
    type:     'ride_complete',
    ride_id:  ride.id,
  } as any);

  await creditDriverEarnings(driverId, earnings);
  return earnings;
}

// ── Drop off one passenger in a multi-stop share ride ────────────────────────
// Does NOT update driver_profiles — caller must credit totals when isLast.

export async function dropOffPassenger(
  passengerRide: ActiveRide
): Promise<number> {
  const fare     = passengerRide.estimated_fare ?? 0;
  const earnings = parseFloat((fare * 0.9).toFixed(2));

  const { error } = await supabase
    .from('rides' as any)
    .update({
      status:          'completed',
      completed_at:    new Date().toISOString(),
      final_fare:      fare,
      driver_earnings: earnings,
    } as any)
    .eq('id', passengerRide.id)
    .in('status', ['in_progress']);
  if (error) throw new Error('Ride already cancelled by passenger.');

  await supabase.from('notifications' as any).insert({
    user_id:  passengerRide.passenger_id,
    title:    'Trip Completed',
    message:  'Your trip has been completed. Thank you for riding with Jih!',
    type:     'ride_complete',
    ride_id:  passengerRide.id,
  } as any);

  return earnings;
}

// ── Cancel ride (driver side) — calls RPC handle_driver_cancellation ──────────

export async function cancelRideByDriver(rideId: string): Promise<void> {
  const { error } = await (supabase.rpc as any)('handle_driver_cancellation', {
    p_ride_id: rideId,
  });
  if (error) throw error;
}

// ── Submit driver rating for passenger ────────────────────────────────────────

export async function submitPassengerRating(
  ride: ActiveRide,
  driverId: string,
  rating: number,
  review?: string
): Promise<void> {
  await supabase.from('ride_ratings').insert({
    ride_id:  ride.id,
    rater_id: driverId,
    rated_id: ride.passenger_id,
    rating,
    review:   review || null,
    rated_as: 'passenger',
  });

  await supabase
    .from('rides' as any)
    .update({ passenger_rating: rating, passenger_review: review || null } as any)
    .eq('id', ride.id);
}

// ── Realtime subscriptions ────────────────────────────────────────────────────

/** Subscribe to updates on a single ride (private / scheduled). */
export function subscribeToRide(
  rideId: string,
  channelId: string,
  onUpdate: (updated: ActiveRide) => void
) {
  return supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
      (payload: any) => onUpdate(payload.new as ActiveRide)
    )
    .subscribe();
}

/** Subscribe to all rides in a share group. */
export function subscribeToGroupRides(
  groupId: string,
  channelId: string,
  onUpdate: (updated: ActiveRide) => void
) {
  return supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'rides',
        filter: `shared_ride_group=eq.${groupId}`,
      },
      (payload: any) => onUpdate(payload.new as ActiveRide)
    )
    .subscribe();
}

/** Subscribe to new pending ride INSERTs (driver request feed). */
export function subscribeToPendingRides(
  channelId: string,
  onInsert: (ride: any) => void,
  onStatusChange?: (status: string) => void
) {
  return supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'rides', filter: 'status=eq.pending' },
      (payload: any) => onInsert(payload.new)
    )
    .subscribe((status: string) => onStatusChange?.(status));
}

/**
 * Subscribe to new share-ride INSERT events (no filter — driver checks
 * vehicle type, distance, and remaining seats in-app, exactly like the web).
 */
export function subscribeToShareRideInserts(
  channelId: string,
  onInsert: (ride: any) => void
) {
  return supabase
    .channel(channelId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides' }, (payload: any) =>
      onInsert(payload.new)
    )
    .subscribe();
}

/** Remove a Supabase Realtime channel. */
export function removeChannel(channel: ReturnType<typeof supabase.channel>) {
  supabase.removeChannel(channel);
}
