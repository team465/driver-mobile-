import { View, Text, StyleSheet } from 'react-native';
import { JihColors } from '@/constants/theme';

export default function JihDriverLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'sm' ? 0.65 : size === 'lg' ? 1.3 : 1;
  return (
    <View style={[s.box, {
      width: 96 * scale, height: 96 * scale,
      borderRadius: 22 * scale,
    }]}>
      <Text style={[s.jih, { fontSize: 42 * scale, letterSpacing: -1 * scale }]}>Jih</Text>
      <Text style={[s.driver, { fontSize: 16 * scale, letterSpacing: 0.2 * scale }]}>driver</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    backgroundColor: '#0D1B36',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#7BB8D9',
    shadowColor: '#7BB8D9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  jih:    { fontWeight: '900', color: JihColors.white, lineHeight: undefined },
  driver: { fontWeight: '700', color: JihColors.gold, marginTop: -4 },
});
