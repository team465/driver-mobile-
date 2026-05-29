import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JihColors } from '@/constants/theme';

const ITEMS = [
  {
    title: 'Email Support',
    subtitle: 'support@jisworld.com',
    icon: '✉️',
    onPress: () => Linking.openURL('mailto:support@jisworld.com'),
  },
  {
    title: 'WhatsApp',
    subtitle: 'Chat with our team',
    icon: '💬',
    onPress: () => Linking.openURL('https://wa.me/85512345678'),
  },
  {
    title: 'Driver Guidelines',
    subtitle: 'Read the driver handbook',
    icon: '📋',
    onPress: () => Linking.openURL('https://jisworld.com/drivers'),
  },
];

export default function SupportScreen() {
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.heading}>Support</Text>
      <Text style={s.subtitle}>We're here to help you.</Text>

      {ITEMS.map(item => (
        <Pressable key={item.title} style={s.card} onPress={item.onPress}>
          <Text style={s.cardIcon}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{item.title}</Text>
            <Text style={s.cardSubtitle}>{item.subtitle}</Text>
          </View>
          <Text style={s.arrow}>›</Text>
        </Pressable>
      ))}

      <View style={s.note}>
        <Text style={s.noteText}>
          🎓 Jih partners with MOOL NGO to provide education for children in Cambodia.
          Passengers can donate $1 per ride.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: JihColors.navy },
  content: { padding: 16, gap: 12 },
  heading: { color: JihColors.white, fontSize: 24, fontWeight: '800', marginBottom: 2 },
  subtitle: { color: JihColors.muted, fontSize: 14, marginBottom: 8 },
  card: {
    backgroundColor: JihColors.navyM, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: JihColors.navyXL,
  },
  cardIcon:     { fontSize: 24 },
  cardTitle:    { color: JihColors.white, fontWeight: '600', fontSize: 15 },
  cardSubtitle: { color: JihColors.muted, fontSize: 13, marginTop: 2 },
  arrow:        { color: JihColors.muted, fontSize: 20 },
  note: {
    backgroundColor: JihColors.gold + '15', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: JihColors.gold + '30', marginTop: 8,
  },
  noteText: { color: JihColors.gold, fontSize: 13, lineHeight: 20 },
});
