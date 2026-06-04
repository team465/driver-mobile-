import { useState } from 'react';
import JihDriverLogo from '@/components/JihDriverLogo';
import {
  ActivityIndicator,
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
import { signIn, requestPasswordReset, resetPasswordWithCode } from '@/api/auth';
import { JihColors } from '@/constants/theme';

type Mode = 'login' | 'forgot-request' | 'forgot-verify';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');

  // ── Login state ─────────────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // ── Forgot password state ───────────────────────────────────────────────────
  const [resetEmail,      setResetEmail]      = useState('');
  const [resetCode,       setResetCode]       = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading,    setResetLoading]    = useState(false);
  const [resetError,      setResetError]      = useState('');
  const [resetSuccess,    setResetSuccess]    = useState('');

  // ── Sign in ─────────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password)     { setError('Please enter your password.'); return; }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/');
    } catch (e: any) {
      const msg: string = e.message ?? '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError("Email or password is incorrect.\n\nIf you don't have an account yet, tap \"Create Account\" below.");
      } else if (msg.includes('verify your email')) {
        setError('Please verify your email first. Check your inbox for the 6-digit code.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot — request code ───────────────────────────────────────────────────
  const handleForgotRequest = async () => {
    if (!resetEmail.trim() || !/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError('Please enter a valid email address.');
      return;
    }
    setResetError('');
    setResetLoading(true);
    try {
      await requestPasswordReset(resetEmail.trim().toLowerCase());
      setMode('forgot-verify');
    } catch (e: any) {
      setResetError(e.message ?? 'Could not send reset code. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // ── Forgot — verify code + set new password ─────────────────────────────────
  const handleResetPassword = async () => {
    const trimmedCode = resetCode.replace(/\D/g, '');
    if (trimmedCode.length !== 6)     { setResetError('Enter the 6-digit code from your email.'); return; }
    if (!newPassword || newPassword.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword)         { setResetError("Passwords don't match."); return; }
    setResetError('');
    setResetLoading(true);
    try {
      await resetPasswordWithCode(resetEmail.trim().toLowerCase(), trimmedCode, newPassword);
      setResetSuccess('Password reset! You can now sign in with your new password.');
      setMode('login');
      setResetCode(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      setResetError(e.message ?? 'Invalid or expired code. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // ── Forgot — request screen ─────────────────────────────────────────────────
  if (mode === 'forgot-request') {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={s.card} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <JihDriverLogo size="md" />
          <Text style={s.title}>Reset your password</Text>
          <Text style={s.subtitle}>Enter your email and we'll send you a 6-digit reset code.</Text>

          {resetError ? <Text style={s.errorText}>{resetError}</Text> : null}

          <TextInput
            style={s.input}
            placeholder="Email address"
            placeholderTextColor={JihColors.muted}
            value={resetEmail}
            onChangeText={t => { setResetEmail(t); setResetError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={handleForgotRequest}
          />

          <Pressable style={[s.btn, resetLoading && s.btnDisabled]} onPress={handleForgotRequest} disabled={resetLoading}>
            {resetLoading ? <ActivityIndicator color={JihColors.navy} /> : <Text style={s.btnText}>Send Reset Code →</Text>}
          </Pressable>

          <Pressable onPress={() => { setMode('login'); setResetError(''); setResetEmail(''); }}>
            <Text style={s.backLink}>← Back to Sign In</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Forgot — verify + new password screen ──────────────────────────────────
  if (mode === 'forgot-verify') {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={s.card} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <JihDriverLogo size="md" />
          <Text style={s.title}>Enter your code</Text>
          <Text style={s.subtitle}>
            Check <Text style={{ color: JihColors.gold, fontWeight: '700' }}>{resetEmail}</Text> for a 6-digit code, then set your new password.
          </Text>

          {resetError ? <Text style={s.errorText}>{resetError}</Text> : null}

          <TextInput
            style={[s.input, { fontSize: 24, fontWeight: '700', letterSpacing: 8, textAlign: 'center' }]}
            placeholder="000000"
            placeholderTextColor={JihColors.muted}
            value={resetCode}
            onChangeText={t => { setResetCode(t.replace(/\D/g, '').slice(0, 6)); setResetError(''); }}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TextInput
            style={s.input}
            placeholder="New password"
            placeholderTextColor={JihColors.muted}
            value={newPassword}
            onChangeText={t => { setNewPassword(t); setResetError(''); }}
            secureTextEntry
            returnKeyType="next"
          />
          <TextInput
            style={s.input}
            placeholder="Confirm new password"
            placeholderTextColor={JihColors.muted}
            value={confirmPassword}
            onChangeText={t => { setConfirmPassword(t); setResetError(''); }}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleResetPassword}
          />

          <Pressable style={[s.btn, resetLoading && s.btnDisabled]} onPress={handleResetPassword} disabled={resetLoading}>
            {resetLoading ? <ActivityIndicator color={JihColors.navy} /> : <Text style={s.btnText}>Reset Password →</Text>}
          </Pressable>

          <Pressable onPress={() => { setMode('forgot-request'); setResetError(''); setResetCode(''); }}>
            <Text style={s.backLink}>← Resend code</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Login screen ────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={s.card} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <JihDriverLogo size="md" />
        <Text style={s.title}>Sign in to your account</Text>

        {error        ? <Text style={s.errorText}>{error}</Text>          : null}
        {resetSuccess ? <Text style={s.successText}>{resetSuccess}</Text> : null}

        <TextInput
          style={s.input}
          placeholder="Email address"
          placeholderTextColor={JihColors.muted}
          value={email}
          onChangeText={t => { setEmail(t); setError(''); }}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={JihColors.muted}
          value={password}
          onChangeText={t => { setPassword(t); setError(''); }}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSignIn}
        />

        <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleSignIn} disabled={loading}>
          {loading ? <ActivityIndicator color={JihColors.navy} /> : <Text style={s.btnText}>Sign In</Text>}
        </Pressable>

        <Pressable onPress={() => { setMode('forgot-request'); setResetEmail(email); setResetError(''); setResetSuccess(''); }}>
          <Text style={s.forgotText}>Forgot password?</Text>
        </Pressable>

        <View style={s.divider}>
          <View style={s.line} />
          <Text style={s.dividerText}>Don't have an account?</Text>
          <View style={s.line} />
        </View>

        <Pressable style={s.signupBtn} onPress={() => router.push('/signup')}>
          <Text style={s.signupBtnText}>Create Account →</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: JihColors.navy, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:          { width: '100%', maxWidth: 400, backgroundColor: JihColors.navyM, borderRadius: 16, padding: 28, gap: 14 },
  logoRow:       { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4, gap: 6 },
  logoText:      { fontSize: 40, fontWeight: '800', color: JihColors.gold, letterSpacing: -1 },
  logoSub:       { fontSize: 18, fontWeight: '600', color: JihColors.white, opacity: 0.7 },
  title:         { fontSize: 16, color: JihColors.white, opacity: 0.8, marginBottom: 4 },
  subtitle:      { fontSize: 14, color: JihColors.muted, lineHeight: 20, marginBottom: 4 },
  errorText:     { color: '#fc8181', fontSize: 14, backgroundColor: 'rgba(220,38,38,0.12)', borderRadius: 8, padding: 12, lineHeight: 20 },
  successText:   { color: '#4ade80', fontSize: 14, backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 8, padding: 12 },
  input:         { backgroundColor: JihColors.navyL, color: JihColors.white, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: JihColors.navyXL },
  btn:           { backgroundColor: JihColors.gold, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 2 },
  btnDisabled:   { opacity: 0.6 },
  btnText:       { color: JihColors.navy, fontWeight: '700', fontSize: 16 },
  forgotText:    { color: JihColors.gold, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  backLink:      { color: JihColors.gold, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  divider:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  line:          { flex: 1, height: 1, backgroundColor: JihColors.navyXL },
  dividerText:   { color: JihColors.muted, fontSize: 11 },
  signupBtn:     { borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: JihColors.gold },
  signupBtnText: { color: JihColors.gold, fontWeight: '700', fontSize: 15 },
});
