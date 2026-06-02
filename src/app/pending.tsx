import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { JihColors } from '@/constants/theme';

const STEPS = [
  { icon: '✅', title: 'Application received',  body: 'We have everything we need from you.',                                          done: true  },
  { icon: '🔍', title: 'Document review',        body: 'Our team checks your documents — usually within 2–3 business days.',           done: false },
  { icon: '📱', title: 'You get notified',       body: "We'll email you as soon as your account is approved.",                         done: false },
  { icon: '💰', title: 'Start earning!',         body: 'Go online and accept your first ride. Keep 100% of the fare.',                 done: false },
];

export default function PendingScreen() {
  const { signOut } = useAuth();

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.hero}>
          <Text style={s.heroIcon}>🎉</Text>
          <Text style={s.heroTitle}>Application submitted!</Text>
          <Text style={s.heroSubtitle}>Great job! You're one step closer to earning with jih.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>What happens next</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepLeft}>
                <View style={[s.stepDot, step.done && s.stepDotDone]}>
                  <Text style={s.stepIcon}>{step.icon}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={[s.stepLine, step.done && s.stepLineDone]} />}
              </View>
              <View style={s.stepContent}>
                <Text style={[s.stepTitle, step.done && s.stepTitleDone]}>{step.title}</Text>
                <Text style={s.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>💡 While you wait</Text>
          {[
            '📱 Keep your phone charged when you go online',
            '🗺️ Learn the popular pickup spots in Siem Reap',
            '⭐ Friendly drivers get more repeat customers',
            '💬 Keep your phone on loud so you hear new requests',
          ].map(tip => <Text key={tip} style={s.tip}>{tip}</Text>)}
        </View>

        <Pressable style={s.contactBtn} onPress={() => Linking.openURL('mailto:support@jisworld.com').catch(() => {})}>
          <Text style={s.contactBtnText}>📧  Questions? Email us</Text>
        </Pressable>

        <Pressable style={s.signOutBtn} onPress={async () => { await signOut(); router.replace('/welcome'); }}>
          <Text style={s.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: JihColors.navy },
  scroll:          { padding: 24, gap: 20, paddingBottom: 60, paddingTop: 60 },
  hero:            { alignItems: 'center', gap: 10 },
  heroIcon:        { fontSize: 64 },
  heroTitle:       { fontSize: 26, fontWeight: '800', color: JihColors.white, textAlign: 'center' },
  heroSubtitle:    { fontSize: 16, color: JihColors.muted, textAlign: 'center', lineHeight: 24, maxWidth: 280 },
  card:            { backgroundColor: JihColors.navyM, borderRadius: 16, padding: 20 },
  cardTitle:       { color: JihColors.gold, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  stepRow:         { flexDirection: 'row', gap: 14 },
  stepLeft:        { alignItems: 'center', width: 44 },
  stepDot:         { width: 44, height: 44, borderRadius: 22, backgroundColor: JihColors.navyXL, justifyContent: 'center', alignItems: 'center' },
  stepDotDone:     { backgroundColor: JihColors.gold + '25', borderWidth: 2, borderColor: JihColors.gold },
  stepIcon:        { fontSize: 20 },
  stepLine:        { width: 2, flex: 1, backgroundColor: JihColors.navyXL, marginVertical: 4, minHeight: 24 },
  stepLineDone:    { backgroundColor: JihColors.gold + '40' },
  stepContent:     { flex: 1, paddingBottom: 20 },
  stepTitle:       { color: JihColors.muted, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  stepTitleDone:   { color: JihColors.white },
  stepBody:        { color: JihColors.muted, fontSize: 13, lineHeight: 18 },
  tipsCard:        { backgroundColor: JihColors.navyM, borderRadius: 14, padding: 18, gap: 10 },
  tipsTitle:       { color: JihColors.white, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  tip:             { color: JihColors.muted, fontSize: 13, lineHeight: 20 },
  contactBtn:      { backgroundColor: JihColors.navyM, borderRadius: 12, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: JihColors.navyXL },
  contactBtnText:  { color: JihColors.white, fontSize: 15, fontWeight: '600' },
  signOutBtn:      { alignItems: 'center', paddingVertical: 8 },
  signOutText:     { color: JihColors.muted, fontSize: 14, textDecorationLine: 'underline' },
});
