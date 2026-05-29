import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useDriver } from '@/contexts/DriverContext';
import { JihColors } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const { driverProfile, expiryWarnings } = useDriver();

  if (!profile) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={JihColors.gold} />
      </View>
    );
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Name',    value: profile.full_name || '—' },
    { label: 'Email',   value: user?.email       || '—' },
    { label: 'Phone',   value: profile.phone      || '—' },
  ];

  const vehicleRows = driverProfile
    ? [
        { label: 'Vehicle',  value: `${driverProfile.vehicle_brand ?? ''} ${driverProfile.vehicle_model ?? ''}`.trim() || '—' },
        { label: 'Type',     value: driverProfile.vehicle_type  || '—' },
        { label: 'Plate',    value: driverProfile.plate_number  || '—' },
        { label: 'Color',    value: driverProfile.vehicle_color || '—' },
      ]
    : [];

  const verifications = driverProfile
    ? [
        { label: 'ID',       ok: driverProfile.is_id_verified       },
        { label: 'License',  ok: driverProfile.is_license_verified  },
        { label: 'Vehicle',  ok: driverProfile.is_vehicle_verified  },
      ]
    : [];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>

      {/* Avatar + name */}
      <View style={s.avatarBlock}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(profile.full_name || user?.email || 'D').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={s.name}>{profile.full_name || 'Driver'}</Text>
        <Text style={s.email}>{user?.email}</Text>
      </View>

      {/* Expiry warnings */}
      {expiryWarnings.length > 0 && (
        <View style={s.section}>
          {expiryWarnings.map((w, i) => (
            <View key={i} style={[s.warningRow, w.level === 'expired' ? s.warningExp : s.warningSoon]}>
              <Text style={[s.warningText, w.level === 'expired' && { color: JihColors.white }]}>
                ⚠ {w.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Personal info */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Personal</Text>
        {rows.map(r => (
          <View key={r.label} style={s.row}>
            <Text style={s.rowLabel}>{r.label}</Text>
            <Text style={s.rowValue}>{r.value}</Text>
          </View>
        ))}
      </View>

      {/* Vehicle info */}
      {vehicleRows.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Vehicle</Text>
          {vehicleRows.map(r => (
            <View key={r.label} style={s.row}>
              <Text style={s.rowLabel}>{r.label}</Text>
              <Text style={s.rowValue}>{r.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Verification status */}
      {verifications.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Verification</Text>
          <View style={s.verifyRow}>
            {verifications.map(v => (
              <View key={v.label} style={s.verifyItem}>
                <Text style={s.verifyIcon}>{v.ok ? '✅' : '⏳'}</Text>
                <Text style={s.verifyLabel}>{v.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: JihColors.navy },
  content: { padding: 16, gap: 16 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  avatarBlock: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: JihColors.gold + '20',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: JihColors.gold + '40',
  },
  avatarText: { color: JihColors.gold, fontSize: 28, fontWeight: '700' },
  name:       { color: JihColors.white, fontSize: 20, fontWeight: '700' },
  email:      { color: JihColors.muted, fontSize: 13 },

  section:      { backgroundColor: JihColors.navyM, borderRadius: 12, padding: 14, gap: 8 },
  sectionTitle: { color: JihColors.gold, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel:  { color: JihColors.muted, fontSize: 14 },
  rowValue:  { color: JihColors.white, fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },

  warningRow:  { borderRadius: 8, padding: 10, backgroundColor: '#fef3c7' },
  warningExp:  { backgroundColor: JihColors.destructive },
  warningSoon: {},
  warningText: { fontSize: 13, fontWeight: '600', color: '#92400e' },

  verifyRow:   { flexDirection: 'row', gap: 12 },
  verifyItem:  { flex: 1, alignItems: 'center', gap: 4 },
  verifyIcon:  { fontSize: 22 },
  verifyLabel: { color: JihColors.muted, fontSize: 12 },
});
