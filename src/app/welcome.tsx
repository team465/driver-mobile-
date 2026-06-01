import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { JihColors } from '@/constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    icon: '💰',
    headline: 'Keep 100% of what you earn',
    body: 'No cuts, no commission. Every dollar a passenger pays goes straight to you.',
    bullets: [
      { icon: '📈', text: 'Top drivers earn $20–40 per day' },
      { icon: '🏦', text: 'Cash out to Wing or ABA anytime' },
      { icon: '📊', text: 'See your earnings in real time' },
    ],
  },
  {
    key: '2',
    icon: '🕐',
    headline: 'Work whenever you want',
    body: 'Morning, evening, weekends — you decide when to go online. No boss, no fixed hours.',
    bullets: [
      { icon: '📱', text: 'One tap to go online or offline' },
      { icon: '🗺️', text: 'Drive anywhere in Siem Reap' },
      { icon: '🚗', text: 'Solo rides or share rides — your choice' },
    ],
  },
  {
    key: '3',
    icon: '⭐',
    headline: 'Join 500+ trusted drivers',
    body: 'Passengers come to you. Build your rating and grow a loyal base of regulars.',
    bullets: [
      { icon: '🔔', text: 'Instant ride notifications' },
      { icon: '🤝', text: 'Tourists & locals both use jih' },
      { icon: '🎓', text: 'Help educate kids with MOOL NGO' },
    ],
  },
];

export default function WelcomeScreen() {
  const [current, setCurrent] = useState(0);
  const listRef = useRef<FlatList>(null);

  const goTo = (index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
    setCurrent(index);
  };

  const handleNext = () => {
    if (current < SLIDES.length - 1) goTo(current + 1);
    else router.push('/signup');
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      <View style={s.header}>
        <Text style={s.logo}>jih</Text>
        <Pressable onPress={() => router.push('/login')}>
          <Text style={s.signInLink}>Sign in</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.key}
        onMomentumScrollEnd={e => {
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <View style={[s.slide, { width }]}>
            <Text style={s.slideIcon}>{item.icon}</Text>
            <Text style={s.headline}>{item.headline}</Text>
            <Text style={s.body}>{item.body}</Text>
            <View style={s.bullets}>
              {item.bullets.map((b: { icon: string; text: string }) => (
                <View key={b.text} style={s.bullet}>
                  <Text style={s.bulletIcon}>{b.icon}</Text>
                  <Text style={s.bulletText}>{b.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)}>
            <View style={[s.dot, i === current && s.dotActive]} />
          </Pressable>
        ))}
      </View>

      <View style={s.footer}>
        <Pressable style={s.primaryBtn} onPress={handleNext}>
          <Text style={s.primaryBtnText}>
            {current === SLIDES.length - 1 ? 'Start Earning Today →' : 'Next →'}
          </Text>
        </Pressable>
        <Pressable style={s.secondaryBtn} onPress={() => router.push('/login')}>
          <Text style={s.secondaryBtnText}>
            Already a driver? <Text style={s.highlight}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: JihColors.navy, paddingTop: 56 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 8 },
  logo:        { fontSize: 32, fontWeight: '800', color: JihColors.gold, letterSpacing: -1 },
  signInLink:  { fontSize: 15, color: JihColors.gold, fontWeight: '600' },

  slide:       { paddingHorizontal: 28, justifyContent: 'center', paddingTop: 16, gap: 16 },
  slideIcon:   { fontSize: 68, textAlign: 'center' },
  headline:    { fontSize: 28, fontWeight: '800', color: JihColors.white, textAlign: 'center', lineHeight: 34, letterSpacing: -0.5 },
  body:        { fontSize: 16, color: '#c7cdd6', textAlign: 'center', lineHeight: 24 },
  bullets:     { gap: 12, marginTop: 4 },
  bullet:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: JihColors.navyM, borderRadius: 12, padding: 14 },
  bulletIcon:  { fontSize: 22, width: 28, textAlign: 'center' },
  bulletText:  { flex: 1, color: JihColors.white, fontSize: 15, fontWeight: '500' },

  dots:        { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: JihColors.navyXL },
  dotActive:   { width: 24, backgroundColor: JihColors.gold },

  footer:           { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  primaryBtn:       { backgroundColor: JihColors.gold, borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  primaryBtnText:   { color: JihColors.navy, fontWeight: '800', fontSize: 17 },
  secondaryBtn:     { alignItems: 'center', paddingVertical: 6 },
  secondaryBtnText: { color: JihColors.muted, fontSize: 15 },
  highlight:        { color: JihColors.gold, fontWeight: '700' },
});
