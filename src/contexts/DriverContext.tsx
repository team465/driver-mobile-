/**
 * DriverContext — React Native port of the jihwolrd driver dashboard logic.
 *
 * Covers:
 *  - DriverRequestsTab  (online toggle, GPS, pending ride feed, accept/decline, countdown)
 *  - DriverActiveRideTab (arrived, start, complete, drop-off, cancel, rating)
 *  - ShareRidePopup     (mid-trip share-ride matching, accept new passenger)
 *  - DriverDashboard    (expiry warnings, active-ride resume on app open)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import {
  type DriverProfile,
  type RideRequest,
  type VerificationError,
  checkCanGoOnline,
  creditDriverEarnings,
  fetchPendingRides,
  fetchRouteCoordinates,
  getDriverProfile,
  getExpiryWarnings,
  normalizeVehicle,
  setHasActiveRide,
  setOnlineStatus,
  type ExpiryWarning,
  updateDriverLocation,
} from '@/api/driver';
import {
  type ActiveRide,
  acceptRide,
  acceptShareRidePassenger,
  cancelRideByDriver,
  completeRide,
  dropOffPassenger,
  getRide,
  getGroupRides,
  markArrived,
  startRide,
  submitPassengerRating,
  subscribeToRide,
  subscribeToGroupRides,
  subscribeToPendingRides,
  subscribeToShareRideInserts,
  removeChannel,
} from '@/api/rides';
import { fetchTodayEarnings } from '@/api/earnings';
import { distanceToRoute, haversineDistance } from '@/lib/geo';
import { useAuth } from './AuthContext';

// ── Types ────────────────────────────────────────────────────────────────────

interface DriverContextValue {
  // State
  driverProfile:       DriverProfile  | null;
  online:              boolean;
  loading:             boolean;
  gpsError:            boolean;
  expiryWarnings:      ExpiryWarning[];
  pendingRequest:      RideRequest    | null;
  activeRide:          ActiveRide     | null;
  activeRideId:        string         | null;
  groupRides:          ActiveRide[];
  driverLocation:      { latitude: number; longitude: number } | null;
  countdown:           number;
  todayEarnings:       number;
  todayRides:          number;
  subscriptionStatus:  string;
  pendingRideCount:    number;
  shareRideQueue:      RideRequest[];   // pending share passengers mid-trip

  // Actions
  toggleOnline:            (value: boolean) => Promise<VerificationError | null>;
  acceptCurrentRide:       () => Promise<void>;
  declineCurrentRide:      () => void;
  handleArrived:           () => Promise<void>;
  handleStartRide:         () => Promise<void>;
  handleCompleteRide:      () => Promise<number>;
  handleDropOff:           (passengerRide: ActiveRide) => Promise<{ earnings: number; isLast: boolean }>;
  handleCancelRide:        () => Promise<void>;
  handleRatePassenger:     (rating: number, review?: string) => Promise<void>;
  acceptSharePassenger:    (request: RideRequest) => Promise<void>;
  dismissSharePassenger:   (requestId: string) => void;
  clearActiveRide:         () => void;
}

const DriverContext = createContext<DriverContextValue | null>(null);

export function useDriver(): DriverContextValue {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriver must be used inside DriverProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function DriverProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [driverProfile,      setDriverProfile]      = useState<DriverProfile | null>(null);
  const [online,             setOnline]             = useState(false);
  const [loading,            setLoading]            = useState(false);
  const [gpsError,           setGpsError]           = useState(false);
  const [expiryWarnings,     setExpiryWarnings]     = useState<ExpiryWarning[]>([]);
  const [pendingRequest,     setPendingRequest]     = useState<RideRequest | null>(null);
  const [activeRideId,       setActiveRideId]       = useState<string | null>(null);
  const [activeRide,         setActiveRide]         = useState<ActiveRide | null>(null);
  const [groupRides,         setGroupRides]         = useState<ActiveRide[]>([]);
  const [driverLocation,     setDriverLocation]     = useState<{ latitude: number; longitude: number } | null>(null);
  const [countdown,          setCountdown]          = useState(15);
  const [todayEarnings,      setTodayEarnings]      = useState(0);
  const [todayRides,         setTodayRides]         = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState('DISCONNECTED');
  const [pendingRideCount,   setPendingRideCount]   = useState(0);
  const [shareRideQueue,     setShareRideQueue]     = useState<RideRequest[]>([]);

  // Refs that don't trigger re-renders but must be current inside callbacks
  const locationSubRef      = useRef<Location.LocationSubscription | null>(null);
  const countdownRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingChannelRef   = useRef<any>(null);
  const rideChannelRef      = useRef<any>(null);
  const groupChannelRef     = useRef<any>(null);
  const shareMatchChannelRef= useRef<any>(null);
  const currentRideRef      = useRef<RideRequest | null>(null);
  const activeRideRef       = useRef<ActiveRide | null>(null);
  const driverLocRef        = useRef<{ latitude: number; longitude: number } | null>(null);
  const routeCoordRef       = useRef<[number, number][] | null>(null);   // OSRM route
  const dismissedShareIds   = useRef<Set<string>>(new Set());
  const remainingSeatsRef   = useRef<number>(0);
  const vehicleTypeRef      = useRef<string | null>(null);

  // Keep refs in sync
  activeRideRef.current  = activeRide;
  driverLocRef.current   = driverLocation;

  // ── Bootstrap on mount ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    (async () => {
      // 1. Load driver profile
      const profile = await getDriverProfile(user.id);
      if (!profile) return;

      setDriverProfile(profile);
      setOnline(profile.is_online);
      setExpiryWarnings(getExpiryWarnings(profile));
      vehicleTypeRef.current  = profile.vehicle_type;
      remainingSeatsRef.current = 0; // will update when active ride loads

      // 2. Resume active ride if driver was mid-trip (DriverDashboard behaviour)
      if (profile.has_active_ride) {
        const { data: rides } = await supabase
          .from('rides' as any)
          .select('*')
          .eq('driver_id', user.id)
          .in('status', ['matched', 'arrived', 'in_progress'])
          .limit(1);

        if (rides && (rides as ActiveRide[]).length > 0) {
          const ride = (rides as ActiveRide[])[0];
          setActiveRideId(ride.id);
          setActiveRide(ride);
        }
      }

      // 3. Load today's stats
      const stats = await fetchTodayEarnings(user.id);
      setTodayEarnings(stats.amount);
      setTodayRides(stats.rides);
    })();
  }, [user]);

  // Keep remaining seats + vehicle type refs in sync with active ride state
  useEffect(() => {
    remainingSeatsRef.current = activeRide?.remaining_seats ?? 0;
    vehicleTypeRef.current    = activeRide?.vehicle_type ?? driverProfile?.vehicle_type ?? null;
  }, [activeRide?.remaining_seats, activeRide?.vehicle_type, driverProfile?.vehicle_type]);

  // ── Pending ride feed (online only) ──────────────────────────────────────

  useEffect(() => {
    if (!online || !driverProfile || !user) return;

    const vt = normalizeVehicle(driverProfile.vehicle_type);

    // Snapshot poll every 5 s — mirrors web setInterval(loadPendingRideSnapshot, 5000)
    pollRef.current = setInterval(async () => {
      if (currentRideRef.current) return;
      const rides = await fetchPendingRides(vt, user.id);
      setPendingRideCount(rides.length);
      if (rides.length > 0) showRideRequest(rides[0]);
    }, 5000);

    // Realtime INSERT — mirrors web Realtime channel
    pendingChannelRef.current = subscribeToPendingRides(
      `pending-rides-${user.id}`,
      (ride: RideRequest) => {
        if (normalizeVehicle(ride.vehicle_type) !== vt) return;
        if (driverProfile.has_active_ride)               return;
        if (currentRideRef.current)                      return;
        setPendingRideCount(c => c + 1);
        showRideRequest(ride);
      },
      setSubscriptionStatus
    );
    setSubscriptionStatus('CONNECTING');

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (pendingChannelRef.current) removeChannel(pendingChannelRef.current);
      pendingChannelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, driverProfile?.vehicle_type, user]);

  // ── Subscribe to single-ride updates ─────────────────────────────────────

  useEffect(() => {
    if (!activeRideId) return;

    rideChannelRef.current = subscribeToRide(
      activeRideId,
      `driver-ride-${activeRideId}`,
      (updated) => {
        setActiveRide(updated);
        if (updated.status === 'cancelled') clearActiveRide();
      }
    );

    return () => {
      if (rideChannelRef.current) { removeChannel(rideChannelRef.current); rideChannelRef.current = null; }
    };
  }, [activeRideId]);

  // ── Subscribe to group ride updates ──────────────────────────────────────

  useEffect(() => {
    if (!activeRide?.shared_ride_group) { setGroupRides([]); return; }

    const groupId = activeRide.shared_ride_group;

    // Load current group snapshot
    getGroupRides(groupId).then(setGroupRides);

    // Subscribe to updates
    groupChannelRef.current = subscribeToGroupRides(
      groupId,
      `group-rides-${groupId}`,
      (updated) => {
        setGroupRides(prev => prev.map(r => r.id === updated.id ? updated : r));
        if (updated.id === activeRideId) setActiveRide(updated);
      }
    );

    return () => {
      if (groupChannelRef.current) { removeChannel(groupChannelRef.current); groupChannelRef.current = null; }
    };
  }, [activeRide?.shared_ride_group, activeRide?.remaining_seats, activeRide?.status]);

  // ── Fetch OSRM route for share-ride proximity checks ─────────────────────
  // Mirrors DriverActiveRideTab's fetchFullRoute useEffect exactly.

  useEffect(() => {
    routeCoordRef.current = null;
    const ride = activeRideRef.current;
    if (!ride || ride.ride_type !== 'share') return;
    if (
      ride.pickup_lat == null || ride.pickup_lng == null ||
      ride.destination_lat == null || ride.destination_lng == null
    ) return;

    let cancelled = false;
    fetchRouteCoordinates(
      ride.pickup_lng, ride.pickup_lat,
      ride.destination_lng, ride.destination_lat
    ).then(coords => {
      if (!cancelled) routeCoordRef.current = coords;
    });

    return () => { cancelled = true; };
  }, [activeRide?.id, activeRide?.ride_type,
      activeRide?.pickup_lat, activeRide?.pickup_lng,
      activeRide?.destination_lat, activeRide?.destination_lng]);

  // ── Share-ride matching listener ──────────────────────────────────────────
  // Mirrors DriverActiveRideTab's share-ride-match channel exactly.
  // Listens for new pending share rides, checks proximity and seats.

  useEffect(() => {
    const ride = activeRide;
    if (!ride || !user) return;
    if (ride.ride_type !== 'share') return;
    if (!ride.shared_ride_group) return;

    const activeStatusRef = { current: ride.status };

    shareMatchChannelRef.current = subscribeToShareRideInserts(
      `share-ride-match-${ride.shared_ride_group}`,
      (newRide: RideRequest) => {
        const currentStatus = activeStatusRef.current;
        if (!['matched', 'arrived', 'in_progress'].includes(currentStatus ?? '')) return;
        if (newRide.status !== 'pending')       return;
        if (newRide.ride_type !== 'share')       return;
        if (normalizeVehicle(newRide.vehicle_type) !== normalizeVehicle(vehicleTypeRef.current ?? '')) return;
        if (newRide.id === ride.id)              return;
        if (dismissedShareIds.current.has(newRide.id)) return;

        const seatsNeeded   = newRide.group_size ?? 1;
        const seatsRemaining = remainingSeatsRef.current;
        if (seatsNeeded > seatsRemaining) return;

        if (newRide.pickup_lat == null || newRide.pickup_lng == null) return;

        // Distance check — prefer route-based, fall back to driver-to-pickup
        let dist = Infinity;
        if (routeCoordRef.current) {
          dist = distanceToRoute(
            { lat: newRide.pickup_lat, lng: newRide.pickup_lng },
            routeCoordRef.current
          );
        } else if (driverLocRef.current) {
          dist = haversineDistance(
            { lat: driverLocRef.current.latitude, lng: driverLocRef.current.longitude },
            { lat: newRide.pickup_lat, lng: newRide.pickup_lng }
          );
        }

        if (dist <= 2) {
          setShareRideQueue(prev => {
            if (prev.some(r => r.id === newRide.id)) return prev;
            return [...prev, newRide];
          });
        }
      }
    );

    return () => {
      if (shareMatchChannelRef.current) {
        removeChannel(shareMatchChannelRef.current);
        shareMatchChannelRef.current = null;
      }
    };
  }, [activeRide?.id, activeRide?.ride_type, activeRide?.shared_ride_group, user]);

  // ── Countdown for pending ride request ────────────────────────────────────

  const startCountdown = (ride: RideRequest) => {
    if (ride.booking_type === 'full_day') return; // no countdown for full-day hires
    setCountdown(15);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          currentRideRef.current = null;
          setPendingRequest(null);
          setPendingRideCount(c => Math.max(c - 1, 0));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const showRideRequest = (ride: RideRequest) => {
    if (currentRideRef.current) return;
    currentRideRef.current = ride;
    setPendingRequest(ride);
    startCountdown(ride);
  };

  // ── Online / offline toggle ───────────────────────────────────────────────

  const toggleOnline = useCallback(async (value: boolean): Promise<VerificationError | null> => {
    if (!user || !driverProfile) return null;

    if (value) {
      const err = checkCanGoOnline(driverProfile);
      if (err) return err;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGpsError(true); return null; }
      setGpsError(false);
    }

    setLoading(true);
    try {
      await setOnlineStatus(user.id, value);
      setOnline(value);
      setSubscriptionStatus(value ? 'CONNECTING' : 'DISCONNECTED');

      if (value) {
        // Start GPS tracking — mirrors web watchPosition
        locationSubRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
          async (loc) => {
            const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setDriverLocation(pos);
            await updateDriverLocation(user.id, loc.coords.latitude, loc.coords.longitude);
          }
        );
      } else {
        // Cancel active ride before going offline (matches web behaviour)
        if (driverProfile.has_active_ride && activeRideId) {
          try { await cancelRideByDriver(activeRideId); } catch { /* ignore */ }
        }
        locationSubRef.current?.remove();
        locationSubRef.current = null;
        setDriverLocation(null);
        currentRideRef.current = null;
        setPendingRequest(null);
        setPendingRideCount(0);
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [user, driverProfile, activeRideId]);

  // ── Accept pending ride request ───────────────────────────────────────────

  const acceptCurrentRide = useCallback(async () => {
    if (!pendingRequest || !user) return;
    if (countdownRef.current) clearInterval(countdownRef.current);

    await acceptRide(
      pendingRequest.id,
      pendingRequest.passenger_id,
      user.id,
      {
        isFullDay:   pendingRequest.booking_type === 'full_day',
        offeredFare: pendingRequest.offered_fare ?? undefined,
      }
    );

    const ride = await getRide(pendingRequest.id);
    setActiveRideId(pendingRequest.id);
    setActiveRide(ride);
    setPendingRideCount(c => Math.max(c - 1, 0));
    currentRideRef.current = null;
    setPendingRequest(null);
  }, [pendingRequest, user]);

  // ── Decline pending ride request ──────────────────────────────────────────

  const declineCurrentRide = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    currentRideRef.current = null;
    setPendingRequest(null);
    setPendingRideCount(c => Math.max(c - 1, 0));
  }, []);

  // ── In-ride actions ───────────────────────────────────────────────────────

  const handleArrived = useCallback(async () => {
    if (!activeRide) return;
    await markArrived(activeRide);
    setActiveRide(prev => prev ? { ...prev, status: 'arrived', arrived_at: new Date().toISOString() } : prev);
  }, [activeRide]);

  const handleStartRide = useCallback(async () => {
    if (!activeRide) return;
    await startRide(activeRide);
    setActiveRide(prev => prev ? { ...prev, status: 'in_progress', started_at: new Date().toISOString() } : prev);
  }, [activeRide]);

  const handleCompleteRide = useCallback(async (): Promise<number> => {
    if (!activeRide || !user) return 0;
    const earnings = await completeRide(activeRide, user.id);
    setTodayEarnings(prev => prev + earnings);
    setTodayRides(prev => prev + 1);
    setActiveRide(prev => prev ? { ...prev, status: 'completed' } : prev);
    return earnings;
  }, [activeRide, user]);

  /**
   * Drop off a single passenger from a share ride.
   * When all passengers are dropped off (isLast), credits earnings to driver
   * profile — matches DriverActiveRideTab.handleDropOffPassenger exactly.
   */
  const handleDropOff = useCallback(async (
    passengerRide: ActiveRide
  ): Promise<{ earnings: number; isLast: boolean }> => {
    if (!user) return { earnings: 0, isLast: false };

    const earnings = await dropOffPassenger(passengerRide);

    const updated = groupRides.map(r =>
      r.id === passengerRide.id ? { ...r, status: 'completed' as const } : r
    );
    setGroupRides(updated);

    const isLast = updated.every(r => ['completed', 'cancelled'].includes(r.status));

    if (isLast) {
      // Sum earnings across all group rides — mirrors web totalEarnings loop
      const totalEarnings = parseFloat(
        updated.reduce((s, r) => s + ((r.estimated_fare ?? 0) * 0.9), 0).toFixed(2)
      );
      await creditDriverEarnings(user.id, totalEarnings);
      setTodayEarnings(prev => prev + totalEarnings);
      setTodayRides(prev => prev + 1);
    }

    return { earnings, isLast };
  }, [user, groupRides]);

  const handleCancelRide = useCallback(async () => {
    if (!activeRideId) return;
    await cancelRideByDriver(activeRideId);
    clearActiveRide();
  }, [activeRideId]);

  const handleRatePassenger = useCallback(async (rating: number, review?: string) => {
    if (!activeRide || !user) return;
    await submitPassengerRating(activeRide, user.id, rating, review);
  }, [activeRide, user]);

  // ── Share-ride mid-trip accept / dismiss ──────────────────────────────────

  const acceptSharePassenger = useCallback(async (request: RideRequest) => {
    if (!activeRide || !user) return;
    if (!activeRide.shared_ride_group) return;

    await acceptShareRidePassenger(
      request,
      activeRide.shared_ride_group,
      remainingSeatsRef.current,
      user.id
    );

    // Remove from queue and refresh active ride (remaining_seats updated)
    setShareRideQueue(prev => prev.filter(r => r.id !== request.id));
    const refreshed = await getRide(activeRide.id);
    if (refreshed) setActiveRide(refreshed);
  }, [activeRide, user]);

  const dismissSharePassenger = useCallback((requestId: string) => {
    dismissedShareIds.current.add(requestId);
    setShareRideQueue(prev => prev.filter(r => r.id !== requestId));
  }, []);

  // ── Clear active ride ─────────────────────────────────────────────────────

  const clearActiveRide = useCallback(() => {
    setActiveRideId(null);
    setActiveRide(null);
    setGroupRides([]);
    setShareRideQueue([]);
    routeCoordRef.current = null;
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => () => {
    locationSubRef.current?.remove();
    if (countdownRef.current)     clearInterval(countdownRef.current);
    if (pollRef.current)          clearInterval(pollRef.current);
    if (pendingChannelRef.current)    removeChannel(pendingChannelRef.current);
    if (rideChannelRef.current)       removeChannel(rideChannelRef.current);
    if (groupChannelRef.current)      removeChannel(groupChannelRef.current);
    if (shareMatchChannelRef.current) removeChannel(shareMatchChannelRef.current);
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────

  return (
    <DriverContext.Provider value={{
      driverProfile,
      online,
      loading,
      gpsError,
      expiryWarnings,
      pendingRequest,
      activeRide,
      activeRideId,
      groupRides,
      driverLocation,
      countdown,
      todayEarnings,
      todayRides,
      subscriptionStatus,
      pendingRideCount,
      shareRideQueue,
      toggleOnline,
      acceptCurrentRide,
      declineCurrentRide,
      handleArrived,
      handleStartRide,
      handleCompleteRide,
      handleDropOff,
      handleCancelRide,
      handleRatePassenger,
      acceptSharePassenger,
      dismissSharePassenger,
      clearActiveRide,
    }}>
      {children}
    </DriverContext.Provider>
  );
}
