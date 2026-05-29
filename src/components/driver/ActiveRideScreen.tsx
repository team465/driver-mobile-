/**
 * ActiveRideScreen — port of DriverActiveRideTab.tsx
 *
 * Handles the full single-ride lifecycle: arrived → start → complete → rate.
 * Multi-stop share rides are also supported (handleDropOff + shareRideQueue).
 * Map is a placeholder — add react-native-maps later.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useDriver } from '@/contexts/DriverContext';
import { type ActiveRide } from '@/api/rides';
import { JihColors } from '@/constants/theme';
import { formatUsd } from '@/lib/currency';

interface Props {
  onRideComplete: () => void;
  onNoRide:       () => void;
}

export default function ActiveRideScreen({ onRideComplete, onNoRide }: Props) {
  const {
    activeRide,
    groupRides,
    driverLocation,
    shareRideQueue,
    handleArrived,
    handleStartRide,
    handleCompleteRide,
    handleDropOff,
    handleCancelRide,
    handleRatePassenger,
    acceptSharePassenger,
    dismissSharePassenger,
    clearActiveRide,
  } = useDriver();

  const [actionLoading,    setActionLoading]    = useState(false);
  const [showConfirmDone,  setShowConfirmDone]  = useState(false);
  const [showCancelRide,   setShowCancelRide]   = useState(false);
  const [showRating,       setShowRating]       = useState(false);
  const [showThankYou,     setShowThankYou]     = useState(false);
  const [earnedAmount,     setEarnedAmount]     = useState(0);
  const [rating,           setRating]           = useState(0);
  const [review,           setReview]           = useState('');
  const [confirmDropOff,   setConfirmDropOff]   = useState<ActiveRide | null>(null);

  const isShare    = activeRide?.ride_type === 'share' && groupRides.length > 1;
  const isFullDay  = activeRide?.booking_type === 'full_day';
  const fare       = isFullDay
    ? (activeRide?.agreed_price ?? activeRide?.offered_fare ?? 0)
    : (activeRide?.estimated_fare ?? 0);

  // ── Share ride queue (inline popup) ─────────────────────────────────────

  const shareRequest = shareRideQueue[0] ?? null;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const wrap = async (fn: () => Promise<any>) => {
    setActionLoading(true);
    try { await fn(); } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setActionLoading(false);
    }
  };

  const doArrived = () => wrap(handleArrived);
  const doStart   = () => wrap(handleStartRide);

  const doComplete = async () => {
    await wrap(async () => {
      const earned = await handleCompleteRide();
      setEarnedAmount(earned);
      setShowConfirmDone(false);
      setShowRating(true);
    });
  };

  const doDropOff = async (ride: ActiveRide) => {
    await wrap(async () => {
      const { earnings, isLast } = await handleDropOff(ride);
      setConfirmDropOff(null);
      if (isLast) {
        setEarnedAmount(earnings);
        setShowRating(true);
      }
    });
  };

  const doCancel = async () => {
    await wrap(async () => {
      await handleCancelRide();
      clearActiveRide();
      setShowCancelRide(false);
      onNoRide();
    });
  };

  const doRating = async () => {
    await wrap(async () => {
      await handleRatePassenger(rating, review || undefined);
      setShowRating(false);
      setShowThankYou(true);
      setTimeout(() => {
        setShowThankYou(false);
        clearActiveRide();
        onRideComplete();
      }, 2500);
    });
  };

  const doSkipRating = () => {
    setShowRating(false);
    setShowThankYou(true);
    setTimeout(() => {
      setShowThankYou(false);
      clearActiveRide();
      onRideComplete();
    }, 2500);
  };

  // ── No active ride ────────────────────────────────────────────────────────

  if (!activeRide) {
    return (
      <View style={s.center}>
        <Text style={s.noRideIcon}>🗺️</Text>
        <Text style={s.noRideTitle}>No Active Ride</Text>
        <Text style={s.noRideSubtitle}>Accept a request to get started.</Text>
        <Pressable style={s.goBtn} onPress={onNoRide}>
          <Text style={s.goBtnText}>Go to Requests</Text>
        </Pressable>
      </View>
    );
  }

  // ── Thank you screen ──────────────────────────────────────────────────────

  if (showThankYou) {
    return (
      <View style={s.center}>
        <Text style={{ fontSize: 52 }}>🎉</Text>
        <Text style={s.thankYouTitle}>Ride Completed!</Text>
        <Text style={s.earnedText}>{formatUsd(earnedAmount)} earned</Text>
        <View style={s.moolNote}>
          <Text style={s.moolNoteText}>
            🎓 Passenger may donate $1 to MOOL NGO for education
          </Text>
        </View>
        <ActivityIndicator color={JihColors.gold} style={{ marginTop: 12 }} />
      </View>
    );
  }

  // ── Rating screen ─────────────────────────────────────────────────────────

  if (showRating) {
    return (
      <ScrollView contentContainerStyle={s.ratingContainer}>
        <Text style={s.ratingTitle}>Ride Complete! 🎉</Text>
        <Text style={s.earnedText}>{formatUsd(earnedAmount)} earned</Text>
        <Text style={s.keepNote}>You keep 100% — no commission</Text>

        <Text style={s.ratingLabel}>Rate your passenger</Text>
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <Pressable key={n} onPress={() => setRating(n)}>
              <Text style={[s.star, n <= rating && s.starFilled]}>★</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={s.reviewInput}
          placeholder="Optional comment…"
          placeholderTextColor={JihColors.muted}
          value={review}
          onChangeText={setReview}
          multiline
          numberOfLines={3}
        />

        <View style={s.actionRow}>
          <Pressable style={s.skipBtn} onPress={doSkipRating}>
            <Text style={s.skipBtnText}>Skip</Text>
          </Pressable>
          <Pressable
            style={[s.submitBtn, (rating === 0 || actionLoading) && s.disabledBtn]}
            onPress={doRating}
            disabled={rating === 0 || actionLoading}
          >
            {actionLoading
              ? <ActivityIndicator color={JihColors.navy} />
              : <Text style={s.submitBtnText}>Submit Rating</Text>
            }
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Active ride ───────────────────────────────────────────────────────────

  const status = activeRide.status;

  return (
    <View style={s.root}>

      {/* Share ride request popup — mirrors ShareRidePopup */}
      {shareRequest && (
        <View style={s.sharePopup}>
          <Text style={s.shareTitle}>👥 Share Ride Request</Text>
          <Text style={s.sharePassenger}>+{shareRequest.group_size ?? 1} person · {formatUsd(shareRequest.estimated_fare)}</Text>
          <Text style={s.shareAddress} numberOfLines={1}>📍 {shareRequest.pickup_address}</Text>
          <View style={s.actionRow}>
            <Pressable style={s.declineBtn} onPress={() => dismissSharePassenger(shareRequest.id)}>
              <Text style={s.declineBtnText}>Decline</Text>
            </Pressable>
            <Pressable style={s.acceptBtn} onPress={() => acceptSharePassenger(shareRequest)}>
              <Text style={s.acceptBtnText}>Accept</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Map placeholder */}
      <View style={s.mapPlaceholder}>
        <Text style={s.mapIcon}>🗺️</Text>
        <Text style={s.mapStatus}>
          {status === 'matched'    ? 'Navigate to Pickup'
          : status === 'arrived'  ? 'Waiting for Passenger'
          : 'Ride In Progress'}
        </Text>
        {driverLocation && (
          <Text style={s.mapCoords}>
            {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      {/* Ride info card */}
      <ScrollView style={s.bottomCard} contentContainerStyle={{ gap: 12, padding: 16 }}>

        {/* Passenger info */}
        <View style={s.passengerRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {(activeRide as any).passenger_name?.charAt(0)?.toUpperCase() ?? '👤'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.passengerName}>{(activeRide as any).passenger_name ?? 'Passenger'}</Text>
            <Text style={s.passengerAddr} numberOfLines={1}>
              {status === 'matched' || status === 'arrived'
                ? activeRide.pickup_address
                : activeRide.destination_address}
            </Text>
          </View>
          {(activeRide as any).passenger_phone && (
            <Pressable
              style={s.callBtn}
              onPress={() => Linking.openURL(`tel:${(activeRide as any).passenger_phone}`)}
            >
              <Text style={s.callBtnText}>📞</Text>
            </Pressable>
          )}
        </View>

        {/* Route summary */}
        {isFullDay ? (
          <View style={s.fullDayBlock}>
            <Text style={s.fullDayLabel}>🕐 Full Day Hire · {formatUsd(fare)}</Text>
            {activeRide.hire_description && (
              <Text style={s.hireDescText}>{activeRide.hire_description}</Text>
            )}
          </View>
        ) : (
          <View style={s.routeSummary}>
            <Text style={s.routeMeta}>
              {activeRide.distance_km?.toFixed(1)} km · {activeRide.duration_minutes} min · {formatUsd(fare)}
              {isShare ? ' · Share' : ''}
            </Text>
          </View>
        )}

        {/* Multi-stop list (share rides) */}
        {isShare && groupRides.length > 0 && (
          <View style={s.stopsBlock}>
            {groupRides
              .filter(r => !['completed', 'cancelled'].includes(r.status))
              .map((r, i) => (
                <View key={r.id} style={s.stopRow}>
                  <Text style={s.stopNum}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stopStatus}>{r.status === 'matched' || r.status === 'arrived' ? 'Pickup' : 'Drop off'}</Text>
                    <Text style={s.stopAddr} numberOfLines={1}>
                      {r.status === 'matched' || r.status === 'arrived' ? r.pickup_address : r.destination_address}
                    </Text>
                  </View>
                  {r.status === 'in_progress' && (
                    <Pressable style={s.dropBtn} onPress={() => setConfirmDropOff(r)}>
                      <Text style={s.dropBtnText}>Drop off</Text>
                    </Pressable>
                  )}
                </View>
              ))}
          </View>
        )}

        {/* Confirm drop off */}
        {confirmDropOff && (
          <View style={s.confirmBlock}>
            <Text style={s.confirmText}>Drop off this passenger?</Text>
            <View style={s.actionRow}>
              <Pressable style={s.declineBtn} onPress={() => setConfirmDropOff(null)}>
                <Text style={s.declineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.greenBtn} onPress={() => doDropOff(confirmDropOff)} disabled={actionLoading}>
                {actionLoading
                  ? <ActivityIndicator color={JihColors.white} />
                  : <Text style={s.greenBtnText}>Confirm</Text>
                }
              </Pressable>
            </View>
          </View>
        )}

        {/* Single-ride action buttons */}
        {!isShare && status === 'matched' && (
          <Pressable style={s.primaryBtn} onPress={doArrived} disabled={actionLoading}>
            {actionLoading
              ? <ActivityIndicator color={JihColors.navy} />
              : <Text style={s.primaryBtnText}>I've Arrived</Text>
            }
          </Pressable>
        )}

        {!isShare && status === 'arrived' && (
          <Pressable style={s.primaryBtn} onPress={doStart} disabled={actionLoading}>
            {actionLoading
              ? <ActivityIndicator color={JihColors.navy} />
              : <Text style={s.primaryBtnText}>Start Ride</Text>
            }
          </Pressable>
        )}

        {!isShare && status === 'in_progress' && !showConfirmDone && (
          <Pressable style={s.greenBtn} onPress={() => setShowConfirmDone(true)}>
            <Text style={s.greenBtnText}>Complete Ride</Text>
          </Pressable>
        )}

        {!isShare && showConfirmDone && (
          <View style={s.confirmBlock}>
            <Text style={s.confirmText}>Complete this ride?</Text>
            <View style={s.actionRow}>
              <Pressable style={s.declineBtn} onPress={() => setShowConfirmDone(false)}>
                <Text style={s.declineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.greenBtn} onPress={doComplete} disabled={actionLoading}>
                {actionLoading
                  ? <ActivityIndicator color={JihColors.white} />
                  : <Text style={s.greenBtnText}>Confirm</Text>
                }
              </Pressable>
            </View>
          </View>
        )}

        {/* Cancel */}
        {['matched', 'arrived', 'in_progress'].includes(status) && !showConfirmDone && !showCancelRide && (
          <Pressable style={s.cancelLink} onPress={() => setShowCancelRide(true)}>
            <Text style={s.cancelLinkText}>Cancel Ride</Text>
          </Pressable>
        )}

        {showCancelRide && (
          <View style={s.confirmBlock}>
            <Text style={[s.confirmText, { color: JihColors.destructive }]}>Cancel this ride?</Text>
            <Text style={s.confirmSubtext}>
              If the passenger paid by wallet, a full refund will be issued.
            </Text>
            <View style={s.actionRow}>
              <Pressable style={s.declineBtn} onPress={() => setShowCancelRide(false)}>
                <Text style={s.declineBtnText}>Go back</Text>
              </Pressable>
              <Pressable style={s.redBtn} onPress={doCancel} disabled={actionLoading}>
                {actionLoading
                  ? <ActivityIndicator color={JihColors.white} />
                  : <Text style={s.redBtnText}>Yes, cancel</Text>
                }
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: JihColors.navy },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: 10, padding: 24, backgroundColor: JihColors.navy,
  },

  // Share popup
  sharePopup: {
    margin: 12, backgroundColor: JihColors.navyM, borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: JihColors.gold + '60', gap: 8,
  },
  shareTitle:     { color: JihColors.white, fontWeight: '700', fontSize: 15 },
  sharePassenger: { color: JihColors.gold,  fontSize: 14, fontWeight: '600' },
  shareAddress:   { color: JihColors.muted, fontSize: 13 },

  // Map placeholder
  mapPlaceholder: {
    height: 180, backgroundColor: JihColors.navyM, margin: 12, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: JihColors.navyXL,
  },
  mapIcon:   { fontSize: 36 },
  mapStatus: { color: JihColors.white, fontWeight: '600', fontSize: 14 },
  mapCoords: { color: JihColors.muted, fontSize: 11 },

  bottomCard: { flex: 1, backgroundColor: JihColors.navyM },

  // No ride
  noRideIcon:     { fontSize: 56 },
  noRideTitle:    { fontSize: 20, fontWeight: '700', color: JihColors.white },
  noRideSubtitle: { fontSize: 14, color: JihColors.muted, textAlign: 'center' },
  goBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: JihColors.gold, borderRadius: 10,
  },
  goBtnText: { color: JihColors.navy, fontWeight: '700', fontSize: 15 },

  // Passenger
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: JihColors.gold + '20', justifyContent: 'center', alignItems: 'center',
  },
  avatarText:    { color: JihColors.gold, fontWeight: '700', fontSize: 16 },
  passengerName: { color: JihColors.white, fontWeight: '600', fontSize: 15 },
  passengerAddr: { color: JihColors.muted, fontSize: 12, marginTop: 1 },
  callBtn:       { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: JihColors.navyXL },
  callBtnText:   { fontSize: 18 },

  // Route
  fullDayBlock: { gap: 6 },
  fullDayLabel: { color: JihColors.gold, fontWeight: '600', fontSize: 14 },
  hireDescText: {
    color: JihColors.muted, fontSize: 13,
    backgroundColor: JihColors.navyXL, borderRadius: 8, padding: 10,
  },
  routeSummary: {},
  routeMeta:    { color: JihColors.muted, fontSize: 13 },

  // Stops
  stopsBlock: { gap: 8 },
  stopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: JihColors.navyXL, borderRadius: 8, padding: 10,
  },
  stopNum:    {
    width: 22, height: 22, borderRadius: 11, backgroundColor: JihColors.gold,
    textAlign: 'center', lineHeight: 22, color: JihColors.navy, fontWeight: '700', fontSize: 12,
  },
  stopStatus: { color: JihColors.muted, fontSize: 11, marginBottom: 2 },
  stopAddr:   { color: JihColors.white, fontSize: 13 },
  dropBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#16a34a', borderRadius: 6,
  },
  dropBtnText: { color: JihColors.white, fontSize: 12, fontWeight: '600' },

  // Confirm
  confirmBlock: { gap: 8 },
  confirmText:  { color: JihColors.white, fontWeight: '600', fontSize: 14, textAlign: 'center' },
  confirmSubtext: { color: JihColors.muted, fontSize: 12, textAlign: 'center' },

  // Thank you
  thankYouTitle: { fontSize: 24, fontWeight: '800', color: JihColors.white },
  earnedText:    { fontSize: 20, fontWeight: '700', color: '#4ade80' },
  keepNote:      { fontSize: 12, color: JihColors.muted },
  moolNote: {
    backgroundColor: JihColors.gold + '15', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: JihColors.gold + '30', maxWidth: 280,
  },
  moolNoteText: { color: JihColors.gold, fontSize: 13, textAlign: 'center' },

  // Rating
  ratingContainer: { padding: 24, gap: 12, alignItems: 'center' },
  ratingTitle:  { fontSize: 22, fontWeight: '800', color: JihColors.white },
  ratingLabel:  { fontSize: 15, fontWeight: '600', color: JihColors.white, marginTop: 4 },
  starsRow:     { flexDirection: 'row', gap: 8 },
  star:         { fontSize: 36, color: JihColors.navyXL },
  starFilled:   { color: JihColors.gold },
  reviewInput: {
    width: '100%', backgroundColor: JihColors.navyM, color: JihColors.white,
    borderRadius: 10, padding: 12, fontSize: 14,
    borderWidth: 1, borderColor: JihColors.navyXL, minHeight: 80, textAlignVertical: 'top',
  },

  // Buttons
  actionRow:   { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    backgroundColor: JihColors.gold, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: { color: JihColors.navy, fontWeight: '700', fontSize: 16 },
  greenBtn: {
    flex: 1, backgroundColor: '#16a34a', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  greenBtnText: { color: JihColors.white, fontWeight: '700', fontSize: 15 },
  redBtn: {
    flex: 1, backgroundColor: JihColors.destructive, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  redBtnText: { color: JihColors.white, fontWeight: '700', fontSize: 15 },
  declineBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1.5,
    borderColor: JihColors.navyXL, paddingVertical: 14, alignItems: 'center',
  },
  declineBtnText: { color: JihColors.white, fontWeight: '600', fontSize: 15 },
  acceptBtn: {
    flex: 2, borderRadius: 10,
    backgroundColor: '#16a34a', paddingVertical: 14, alignItems: 'center',
  },
  acceptBtnText: { color: JihColors.white, fontWeight: '700', fontSize: 15 },
  skipBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1.5,
    borderColor: JihColors.navyXL, paddingVertical: 14, alignItems: 'center',
  },
  skipBtnText: { color: JihColors.white, fontWeight: '600', fontSize: 15 },
  submitBtn: {
    flex: 2, backgroundColor: JihColors.gold,
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  submitBtnText: { color: JihColors.navy, fontWeight: '700', fontSize: 15 },
  disabledBtn:   { opacity: 0.5 },
  cancelLink:    { alignItems: 'center', paddingVertical: 4 },
  cancelLinkText: {
    color: JihColors.destructive, fontSize: 14,
    textDecorationLine: 'underline',
  },
});
