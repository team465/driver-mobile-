import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { getExistingApplication } from '@/api/applications';
import { JihColors } from '@/constants/theme';

export default function RejectedScreen() {
  const { user, signOut } = useAuth();
  const [reason,  setReason]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getExistingApplication(user.id).then(app => {
      setReason((app as any)?.rejectionReason ?? null);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <View style={s.center}><ActivityIndicator color={JihColors.gold} size="large" /></View>;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.hero}>
          <Text style={s.heroIcon}>📋</Text>
          <Text style={s.heroTitle}>Application needs updates</Text>
          <Text style={s.heroSubtitle}>
            Don't worry — many drivers get approved on their second try. Here's what to fix:
          </Text>
        </View>

        <View style={s.reasonCard}>
          <Text style={s.reasonTitle}>📌 {reason ? 'Feedback from our team' : 'Common reasons for rejection'}</Text>
          {reason
            ? <Text style={s.reasonText}>{reason}</Text>
            : [
                "📷 Documents were blurry or expired",
                "📋 Missing required documents",
                "🪪 ID information didn't match",
                "🏍️ Vehicle photo wasn't clear enough",
              ].map(r => <Text key={r} style={s.reasonBullet}>{r}</Text>)
          }
        </View>

        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>✅ Before you resubmit</Text>
          {[
            'Take new, clear photos of all documents in good lighting',
            'Make sure no documents are expired',
            'Check that your name matches across all documents',
            'Take a clear, well-lit photo of your vehicle',
          ].map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <Text style={s.tipNum}>{i + 1}</Text>
              <Text style={s.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <Pressable style={s.resubmitBtn} onPress={() => router.replace('/apply')}>
          <Text style={s.resubmitBtnText}>Fix & Resubmit Application →</Text>
        </Pressable>

        <Pressable style={s.contactBtn} onPress={() => Linking.openURL('mailto:support@jisworld.com')}>
          <Text style={s.contactBtnText}>📧  Still confused? Email support</Text>
        </Pressable>

        <Pressable style={s.signOutBtn} onPress={signOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: JihColors.navy },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: JihColors.navy },
  scroll:          { padding: 24, gap: 20, paddingBottom: 60, paddingTop: 60 },
  hero:            { alignItems: 'center', gap: 10 },
  heroIcon:        { fontSize: 64 },
  heroTitle:       { fontSize: 24, fontWeight: '800', color: JihColors.white, textAlign: 'center' },
  heroSubtitle:    { fontSize: 15, color: JihColors.muted, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  reasonCard:      { backgroundColor: JihColors.navyM, borderRadius: 14, padding: 18, gap: 10, borderWidth: 1, borderColor: JihColors.destructive + '40' },
  reasonTitle:     { color: JihColors.white, fontSize: 15, fontWeight: '700' },
  reasonText:      { color: '#fca5a5', fontSize: 14, lineHeight: 20 },
  reasonBullet:    { color: JihColors.muted, fontSize: 14, lineHeight: 22 },
  tipsCard:        { backgroundColor: JihColors.navyM, borderRadius: 14, padding: 18, gap: 12 },
  tipsTitle:       { color: JihColors.white, fontSize: 15, fontWeight: '700' },
  tipRow:          { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tipNum:          { width: 22, height: 22, borderRadius: 11, backgroundColor: JihColors.gold, color: JihColors.navy, fontWeight: '800', fontSize: 12, textAlign: 'center', lineHeight: 22 },
  tipText:         { flex: 1, color: JihColors.muted, fontSize: 13, lineHeight: 20 },
  resubmitBtn:     { backgroundColor: JihColors.gold, borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  resubmitBtnText: { color: JihColors.navy, fontWeight: '800', fontSize: 17 },
  contactBtn:      { backgroundColor: JihColors.navyM, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: JihColors.navyXL },
  contactBtnText:  { color: JihColors.white, fontSize: 14, fontWeight: '600' },
  signOutBtn:      { alignItems: 'center', paddingVertical: 8 },
  signOutText:     { color: JihColors.muted, fontSize: 14, textDecorationLine: 'underline' },
});
