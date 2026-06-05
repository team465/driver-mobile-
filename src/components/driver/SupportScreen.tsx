import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DriverSupportAPI } from '@/lib/api';
import { JihColors } from '@/constants/theme';

const CATEGORIES = ['Trip Issue', 'Payment', 'Account', 'App Bug', 'Other'];

const openURL = (url: string) => {
  Linking.openURL(url).catch(() =>
    Alert.alert('Cannot open', `Please visit or contact:\n${url}`)
  );
};

const CONTACTS = [
  {
    icon: 'mail'        as const,
    title: 'Email Support',
    subtitle: 'support@jisworld.com',
    onPress: () => openURL('mailto:support@jisworld.com'),
  },
  {
    icon: 'message-circle' as const,
    title: 'WhatsApp',
    subtitle: 'Chat with our team',
    onPress: () => openURL('https://wa.me/85512345678'),
  },
  {
    icon: 'book-open'   as const,
    title: 'Driver Guidelines',
    subtitle: 'Read the driver handbook',
    onPress: () => openURL('https://jisworld.com/drivers'),
  },
];

export default function SupportScreen() {
  const [subject,    setSubject]    = useState('');
  const [category,   setCategory]   = useState(CATEGORIES[0]);
  const [message,    setMessage]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Please fill in the subject and message.');
      return;
    }
    setSubmitting(true);
    try {
      await DriverSupportAPI.submit(subject.trim(), category, message.trim());
      setSubmitted(true);
      setSubject('');
      setMessage('');
      setCategory(CATEGORIES[0]);
    } catch (err: any) {
      Alert.alert('Failed to send', err.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

      <Text style={s.heading}>Support</Text>
      <Text style={s.subtitle}>We're here to help you.</Text>

      {/* ── Quick contacts ── */}
      {CONTACTS.map(item => (
        <Pressable key={item.title} style={s.card} onPress={item.onPress}>
          <View style={s.cardIconWrap}>
            <Feather name={item.icon} size={18} color={JihColors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{item.title}</Text>
            <Text style={s.cardSubtitle}>{item.subtitle}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={JihColors.muted} />
        </Pressable>
      ))}

      {/* ── Ticket form ── */}
      <View style={s.formCard}>
        <View style={s.formHeader}>
          <Feather name="send" size={16} color={JihColors.gold} />
          <Text style={s.formTitle}>Send a support ticket</Text>
        </View>

        {submitted && (
          <View style={s.successBanner}>
            <Feather name="check-circle" size={15} color="#22c55e" />
            <Text style={s.successText}>Ticket submitted! We'll reply to your email.</Text>
          </View>
        )}

        <Text style={s.label}>Category</Text>
        <View style={s.categoryRow}>
          {CATEGORIES.map(c => (
            <Pressable
              key={c}
              style={[s.categoryChip, category === c && s.categoryChipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[s.categoryChipText, category === c && s.categoryChipTextActive]}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>Subject</Text>
        <TextInput
          style={s.input}
          placeholder="Brief description of your issue"
          placeholderTextColor={JihColors.muted}
          value={subject}
          onChangeText={setSubject}
          returnKeyType="next"
        />

        <Text style={s.label}>Message</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Describe your issue in detail..."
          placeholderTextColor={JihColors.muted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <Pressable
          style={[s.submitBtn, submitting && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={JihColors.navy} size="small" />
            : <>
                <Feather name="send" size={15} color={JihColors.navy} />
                <Text style={s.submitBtnText}>Send Ticket</Text>
              </>
          }
        </Pressable>
      </View>

      {/* ── NGO note ── */}
      <View style={s.note}>
        <Feather name="heart" size={14} color={JihColors.gold} style={{ marginTop: 2 }} />
        <Text style={s.noteText}>
          Jih partners with MOOL NGO to provide education for children in Cambodia.
          Passengers can donate $1 per ride.
        </Text>
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: JihColors.navy },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  heading:  { color: JihColors.white, fontSize: 24, fontWeight: '800', marginBottom: 2 },
  subtitle: { color: JihColors.muted, fontSize: 14, marginBottom: 4 },

  card: {
    backgroundColor: JihColors.navyM, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: JihColors.navyXL,
  },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: JihColors.gold + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle:    { color: JihColors.white, fontWeight: '600', fontSize: 15 },
  cardSubtitle: { color: JihColors.muted, fontSize: 13, marginTop: 2 },

  formCard: {
    backgroundColor: JihColors.navyM, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: JihColors.navyXL, gap: 10,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  formTitle:  { color: JihColors.white, fontSize: 15, fontWeight: '700' },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#22c55e18', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#22c55e40',
  },
  successText: { color: '#22c55e', fontSize: 13, fontWeight: '600', flex: 1 },

  label: { color: JihColors.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: JihColors.navyL, borderWidth: 1, borderColor: JihColors.navyXL,
  },
  categoryChipActive:     { backgroundColor: JihColors.gold + '20', borderColor: JihColors.gold },
  categoryChipText:       { color: JihColors.muted, fontSize: 13, fontWeight: '500' },
  categoryChipTextActive: { color: JihColors.gold, fontWeight: '700' },

  input: {
    backgroundColor: JihColors.navyL, borderRadius: 10, padding: 12,
    color: JihColors.white, fontSize: 14,
    borderWidth: 1, borderColor: JihColors.navyXL,
  },
  textArea: { minHeight: 100 },

  submitBtn: {
    backgroundColor: JihColors.gold, borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitBtnText: { color: JihColors.navy, fontWeight: '800', fontSize: 15 },

  note: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: JihColors.gold + '15', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: JihColors.gold + '30',
  },
  noteText: { color: JihColors.gold, fontSize: 13, lineHeight: 20, flex: 1 },
});
