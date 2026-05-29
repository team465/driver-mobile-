/**
 * RequestsScreen — port of DriverRequestsTab.tsx
 *
 * Handles: online/offline toggle, GPS permissions, expiry warnings,
 * pending ride card with 15-second countdown, accept / decline.
 */

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useDriver } from '@/contexts/DriverContext';
import { JihColors } from '@/constants/theme';
import { formatUsd } from '@/lib/currency';

interface Props {
  onRideAccepted: () => void;
}

export default function RequestsScreen({ onRideAccepted }: Props) {
  const {
    driverProfile,
    online,
    loading,
    gpsError,
    expiryWarnings,
    pendingRequest,
    countdown,
    todayEarnings,
    todayRides,
    subscriptionStatus,
    pendingRideCount,
    toggleOnline,
    acceptCurrentRide,
    declineCurrentRide,
  } = useDriver();

  // ── Toggle handler ────────────────────────────────────────────────────────

  const handleToggle = async (val: boolean) => {
    const err = await toggleOnline(val);
    if (err === 'not_verified') {
      Alert.alert('Not Verified', 'You must be fully verified to go online. Please contact admin.');
    } else if (err === 'license_expired') {
      Alert.alert('License Expired', 'Your license has expired. Please update to continue.');
    } else if (err === 'vehicle_expired') {
      Alert.alert('Registration Expired', 'Your vehicle registration has expired. Please update.');
    }
  };

  // ── Accept ────────────────────────────────────────────────────────────────

  const handleAccept = async () => {
    await acceptCurrentRide();
    onRideAccepted();
  };

  // ── Loading guard ─────────────────────────────────────────────────────────

  if (!driverProfile) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={JihColors.gold} size="large" />
        <Text style={s.loadingText}>Loading driver profile…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>

      {/* Expiry warnings — mirrors DriverRequestsTab + DriverDashboard */}
      {expiryWarnings.length > 0 && (
        <View style={s.warningStack}>
          {expiryWarnings.map((w, i) => (
            <View
              key={i}
              style={[s.warningRow, w.level === 'expired' ? s.warningExpired : s.warningSoon]}
            >
              <Text style={[s.warningText, w.level === 'expired' && s.warningExpiredText]}>
                ⚠ {w.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* GPS error banner */}
      {gpsError && (
        <View style={s.gpsBanner}>
          <Text style={s.gpsText}>
            📍 Location access required. Enable location in Settings and try again.
          </Text>
        </View>
      )}

      {/* Online toggle bar */}
      <View style={s.toggleBar}>
        <View>
          <Text style={[s.onlineLabel, online ? s.onlineLabelActive : null]}>
            {online ? '🟢 Online' : '⚫ Offline'}
          </Text>
          {online && (
            <Text style={s.statsText}>
              Today: {formatUsd(todayEarnings)} · {todayRides} rides
            </Text>
          )}
          {online && (
            <Text style={s.debugText}>
              {subscriptionStatus} · {pendingRideCount} pending
            </Text>
          )}
        </View>
        <View style={s.toggleRow}>
          <Text style={s.toggleHint}>{online ? 'Go Offline' : 'Go Online'}</Text>
          <Switch
            value={online}
            onValueChange={handleToggle}
            disabled={loading}
            trackColor={{ false: JihColors.navyXL, true: JihColors.gold }}
            thumbColor={online ? JihColors.navy : JihColors.muted}
          />
        </View>
      </View>

      {/* Waiting state */}
      {online && !pendingRequest && (
        <View style={s.waitingCard}>
          <View style={s.pulseRow}>
            <View style={s.pulseDot} />
            <Text style={s.waitingTitle}>You are online</Text>
          </View>
          <Text style={s.waitingSubtitle}>Waiting for ride requests…</Text>
        </View>
      )}

      {/* Offline state */}
      {!online && (
        <View style={s.offlineView}>
          <Text style={s.offlineIcon}>🏁</Text>
          <Text style={s.offlineTitle}>You are offline</Text>
          <Text style={s.offlineSubtitle}>
            Toggle online to start receiving ride requests.
          </Text>
        </View>
      )}

      {/* Pending ride request card */}
      {pendingRequest && (
        <View style={s.requestCard}>
          <Text style={s.requestTitle}>🔔 New Ride Request!</Text>

          {/* Badges */}
          <View style={s.badgeRow}>
            {pendingRequest.preferred_driver_id && (
              <View style={s.badge}>
                <Text style={s.badgeText}>❤️ Direct Request</Text>
              </View>
            )}
            {pendingRequest.booking_type === 'full_day' && (
              <View style={s.badge}>
                <Text style={s.badgeText}>🕐 Full Day Hire</Text>
              </View>
            )}
            {pendingRequest.booking_type === 'scheduled' && (
              <View style={s.badge}>
                <Text style={s.badgeText}>📅 Scheduled</Text>
              </View>
            )}
            {pendingRequest.ride_type === 'share' && (
              <View style={s.badge}>
                <Text style={s.badgeText}>👥 Share Ride</Text>
              </View>
            )}
          </View>

          {/* Countdown bar */}
          {pendingRequest.booking_type !== 'full_day' && (
            <>
              <View style={s.countdownTrack}>
                <View
                  style={[
                    s.countdownFill,
                    { width: `${(countdown / 15) * 100}%` as any },
                    countdown <= 5 && s.countdownRed,
                  ]}
                />
              </View>
              <Text style={[s.countdownText, countdown <= 5 && s.countdownTextRed]}>
                {countdown}s remaining
              </Text>
            </>
          )}
          {pendingRequest.booking_type === 'full_day' && (
            <Text style={s.noCountdownText}>Take your time to review</Text>
          )}

          {/* Route */}
          <View style={s.routeBlock}>
            <View style={s.routeRow}>
              <Text style={s.routeDot}>🟢</Text>
              <Text style={s.routeText} numberOfLines={2}>{pendingRequest.pickup_address}</Text>
            </View>
            {pendingRequest.booking_type !== 'full_day' && pendingRequest.destination_address && (
              <View style={s.routeRow}>
                <Text style={s.routeDot}>🔴</Text>
                <Text style={s.routeText} numberOfLines={2}>{pendingRequest.destination_address}</Text>
              </View>
            )}
            {pendingRequest.booking_type === 'full_day' && pendingRequest.hire_description && (
              <View style={s.hireDesc}>
                <Text style={s.hireDescText}>{pendingRequest.hire_description}</Text>
              </View>
            )}
          </View>

          {/* Trip stats */}
          <View style={s.statsRow}>
            {pendingRequest.booking_type !== 'full_day' && (
              <>
                <Text style={s.statItem}>📍 {pendingRequest.distance_km?.toFixed(1)} km</Text>
                <Text style={s.statItem}>⏱ {pendingRequest.duration_minutes} min</Text>
              </>
            )}
            <Text style={s.fareAmount}>
              {formatUsd(
                pendingRequest.booking_type === 'full_day'
                  ? (pendingRequest.offered_fare ?? 0)
                  : pendingRequest.estimated_fare
              )}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={s.actionRow}>
            <Pressable style={s.declineBtn} onPress={declineCurrentRide}>
              <Text style={s.declineBtnText}>Decline</Text>
            </Pressable>
            <Pressable style={s.acceptBtn} onPress={handleAccept} disabled={loading}>
              {loading
                ? <ActivityIndicator color={JihColors.white} />
                : <Text style={s.acceptBtnText}>
                    {pendingRequest.booking_type === 'full_day'
                      ? `Accept ${formatUsd(pendingRequest.offered_fare ?? 0)}`
                      : 'Accept Ride'}
                  </Text>
              }
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: JihColors.navy,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: JihColors.muted,
    fontSize: 14,
  },

  // Warnings
  warningStack: { gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  warningRow: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef3c7',
  },
  warningExpired: { backgroundColor: JihColors.destructive },
  warningText:    { fontSize: 13, fontWeight: '600', color: '#92400e' },
  warningExpiredText: { color: JihColors.white },
  warningSoon:    {},

  // GPS
  gpsBanner: {
    margin: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  gpsText: { color: '#fc8181', fontSize: 13, lineHeight: 18 },

  // Toggle
  toggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: JihColors.navyXL,
  },
  onlineLabel: { fontSize: 18, fontWeight: '700', color: JihColors.muted },
  onlineLabelActive: { color: '#4ade80' },
  statsText:  { fontSize: 12, color: JihColors.muted, marginTop: 2 },
  debugText:  { fontSize: 10, color: JihColors.navyXL, marginTop: 1 },
  toggleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleHint: { fontSize: 13, color: JihColors.muted },

  // Waiting
  waitingCard: {
    margin: 16,
    backgroundColor: JihColors.navyM,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: JihColors.navyXL,
    alignItems: 'center',
  },
  pulseRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  pulseDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  waitingTitle:  { fontSize: 16, fontWeight: '600', color: JihColors.white },
  waitingSubtitle: { fontSize: 13, color: JihColors.muted },

  // Offline
  offlineView:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24 },
  offlineIcon:     { fontSize: 56 },
  offlineTitle:    { fontSize: 20, fontWeight: '700', color: JihColors.white },
  offlineSubtitle: { fontSize: 14, color: JihColors.muted, textAlign: 'center' },

  // Request card
  requestCard: {
    margin: 12,
    backgroundColor: JihColors.navyM,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: JihColors.gold + '40',
  },
  requestTitle: { fontSize: 18, fontWeight: '700', color: JihColors.white, textAlign: 'center' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  badge:    { backgroundColor: JihColors.gold + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: JihColors.gold, fontSize: 12, fontWeight: '600' },

  countdownTrack: {
    height: 6,
    backgroundColor: JihColors.navyXL,
    borderRadius: 3,
    overflow: 'hidden',
  },
  countdownFill: {
    height: '100%',
    backgroundColor: JihColors.gold,
    borderRadius: 3,
  },
  countdownRed:      { backgroundColor: JihColors.destructive },
  countdownText:     { textAlign: 'center', fontSize: 13, fontWeight: '700', color: JihColors.white },
  countdownTextRed:  { color: JihColors.destructive },
  noCountdownText:   { textAlign: 'center', fontSize: 12, color: JihColors.muted },

  routeBlock: { gap: 8 },
  routeRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  routeDot:   { fontSize: 12, marginTop: 2 },
  routeText:  { flex: 1, color: JihColors.white, fontSize: 14, lineHeight: 20 },
  hireDesc:   { backgroundColor: JihColors.navyXL, borderRadius: 8, padding: 10 },
  hireDescText: { color: JihColors.muted, fontSize: 13 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statItem: { color: JihColors.muted, fontSize: 13 },
  fareAmount: { marginLeft: 'auto', fontSize: 22, fontWeight: '800', color: JihColors.gold },

  actionRow:   { flexDirection: 'row', gap: 10, marginTop: 4 },
  declineBtn:  {
    flex: 1, borderRadius: 10, borderWidth: 1.5,
    borderColor: JihColors.navyXL, paddingVertical: 14,
    alignItems: 'center',
  },
  declineBtnText: { color: JihColors.white, fontWeight: '600', fontSize: 15 },
  acceptBtn:   {
    flex: 2, borderRadius: 10,
    backgroundColor: '#16a34a', paddingVertical: 14,
    alignItems: 'center',
  },
  acceptBtnText: { color: JihColors.white, fontWeight: '700', fontSize: 15 },
});
