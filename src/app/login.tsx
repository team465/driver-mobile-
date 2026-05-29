import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { signIn } from '@/api/auth';
import { JihColors } from '@/constants/theme';

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/');
    } catch (e: any) {
      setError(e.message || 'Sign in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={s.card}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Logo */}
        <View style={s.logoRow}>
          <Text style={s.logoText}>jih</Text>
          <Text style={s.logoSub}>Driver</Text>
        </View>

        <Text style={s.title}>Sign in to your account</Text>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={JihColors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />

        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={JihColors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSignIn}
        />

        <Pressable
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={JihColors.navy} />
            : <Text style={s.btnText}>Sign In</Text>
          }
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: JihColors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: JihColors.navyM,
    borderRadius: 16,
    padding: 28,
    gap: 14,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
    gap: 6,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: JihColors.gold,
    letterSpacing: -1,
  },
  logoSub: {
    fontSize: 18,
    fontWeight: '600',
    color: JihColors.white,
    opacity: 0.7,
  },
  title: {
    fontSize: 16,
    color: JihColors.white,
    opacity: 0.8,
    marginBottom: 4,
  },
  errorText: {
    color: '#fc8181',
    fontSize: 14,
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderRadius: 8,
    padding: 10,
  },
  input: {
    backgroundColor: JihColors.navyL,
    color: JihColors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: JihColors.navyXL,
  },
  btn: {
    backgroundColor: JihColors.gold,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: JihColors.navy,
    fontWeight: '700',
    fontSize: 16,
  },
});
