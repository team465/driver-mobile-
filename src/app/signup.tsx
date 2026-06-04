import { useState } from 'react';
import JihDriverLogo from '@/components/JihDriverLogo';
import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signUp, verifyEmail, resendVerification } from '@/api/auth';
import { JihColors } from '@/constants/theme';

export default function SignUpScreen() {
  // ── Sign-up form state ──────────────────────────────────────────────────────
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  // ── Verification step state ─────────────────────────────────────────────────
  const [pendingEmail,  setPendingEmail]  = useState('');
  const [code,          setCode]          = useState('');
  const [verifyError,   setVerifyError]   = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg,     setResendMsg]     = useState('');

  // ── Signup ──────────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim())         e.fullName = 'Please enter your full name.';
    if (!email.trim())            e.email    = 'Please enter your email address.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "That doesn't look like a valid email.";
    if (!password)                e.password = 'Choose a password.';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (password !== confirm)     e.confirm  = "Passwords don't match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await signUp(email.trim().toLowerCase(), password, fullName.trim());
      if (result.needsVerification) {
        setPendingEmail(email.trim().toLowerCase());
      } else {
        router.replace('/apply');
      }
    } catch (e: any) {
      const msg: string = e.message ?? '';
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setErrors({ form: 'An account with this email already exists. Please sign in instead.' });
      } else {
        setErrors({ form: msg || 'Sign up failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Verify email ────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== 6) { setVerifyError('Enter the 6-digit code from your email.'); return; }
    setVerifyError('');
    setVerifyLoading(true);
    try {
      await verifyEmail(pendingEmail, trimmed);
      router.replace('/login');
    } catch (e: any) {
      setVerifyError(e.message ?? 'Invalid or expired code. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMsg('');
    setResendLoading(true);
    try {
      await resendVerification(pendingEmail);
      setResendMsg('A new code was sent to your email.');
    } catch (e: any) {
      setVerifyError(e.message ?? 'Could not resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // ── Verification screen ─────────────────────────────────────────────────────
  if (pendingEmail) {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={s.card} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <JihDriverLogo size="md" />
          <Text style={s.title}>Check your email</Text>
          <Text style={s.subtitle}>
            We sent a 6-digit verification code to{'\n'}
            <Text style={{ color: JihColors.gold, fontWeight: '700' }}>{pendingEmail}</Text>
          </Text>

          {verifyError ? <View style={s.errorBox}><Text style={s.errorText}>{verifyError}</Text></View> : null}
          {resendMsg   ? <View style={s.successBox}><Text style={s.successText}>{resendMsg}</Text></View> : null}

          <TextInput
            style={s.codeInput}
            placeholder="000000"
            placeholderTextColor={JihColors.muted}
            value={code}
            onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setVerifyError(''); setResendMsg(''); }}
            keyboardType="number-pad"
            maxLength={6}
          />

          <Pressable style={[s.btn, verifyLoading && s.btnDisabled]} onPress={handleVerify} disabled={verifyLoading}>
            {verifyLoading
              ? <ActivityIndicator color={JihColors.navy} />
              : <Text style={s.btnText}>Confirm Email →</Text>}
          </Pressable>

          <Pressable style={[s.ghostBtn, resendLoading && s.btnDisabled]} onPress={handleResend} disabled={resendLoading}>
            {resendLoading
              ? <ActivityIndicator color={JihColors.gold} size="small" />
              : <Text style={s.ghostBtnText}>Resend code</Text>}
          </Pressable>

          <Pressable onPress={() => { setPendingEmail(''); setCode(''); setVerifyError(''); setResendMsg(''); }}>
            <Text style={[s.backLink, { textAlign: 'center' }]}>← Back</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Sign-up form ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <Text style={s.backLink}>← Back</Text>
        </Pressable>

        <JihDriverLogo size="md" />
        <Text style={s.title}>Create your driver account</Text>
        <Text style={s.subtitle}>Takes 2 minutes. You'll apply to drive next.</Text>

        {errors.form ? <View style={s.errorBox}><Text style={s.errorText}>{errors.form}</Text></View> : null}

        <Field label="Full name"        placeholder="e.g. Dara Chan"        value={fullName}  onChangeText={setFullName}  autoCapitalize="words"  error={errors.fullName} />
        <Field label="Email address"    placeholder="you@example.com"        value={email}     onChangeText={setEmail}     autoCapitalize="none"   keyboardType="email-address" error={errors.email} />
        <Field label="Password"         placeholder="At least 6 characters"  value={password}  onChangeText={setPassword}  secureTextEntry         error={errors.password} />
        <Field label="Confirm password" placeholder="Same password again"    value={confirm}   onChangeText={setConfirm}   secureTextEntry         error={errors.confirm} />

        <View style={s.note}>
          <Feather name="lock" size={14} color="#9ca3af" />
          <Text style={s.noteText}>Your information is secure and only used to verify your driver account.</Text>
        </View>

        <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleSignUp} disabled={loading}>
          {loading
            ? <ActivityIndicator color={JihColors.navy} />
            : <Text style={s.btnText}>Create Account & Continue →</Text>}
        </Pressable>

        <Pressable style={s.signinRow} onPress={() => router.push('/login')}>
          <Text style={s.signinText}>Already have an account? <Text style={s.signinLink}>Sign in</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, ...props }: { label: string; error?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput style={[f.input, error ? f.inputError : null]} placeholderTextColor={JihColors.muted} returnKeyType="next" {...props} />
      {error ? <Text style={f.error}>{error}</Text> : null}
    </View>
  );
}

const f = StyleSheet.create({
  wrap:       { gap: 6 },
  label:      { color: JihColors.white, fontSize: 14, fontWeight: '600' },
  input:      { backgroundColor: JihColors.navyM, color: JihColors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1.5, borderColor: JihColors.navyXL },
  inputError: { borderColor: JihColors.destructive },
  error:      { color: '#fc8181', fontSize: 13 },
});

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: JihColors.navy },
  scroll:      { padding: 24, gap: 16, paddingBottom: 48 },
  card:        { flex: 1, justifyContent: 'center', padding: 28, gap: 16 },
  back:        { marginBottom: 8, marginTop: 40 },
  backLink:    { color: JihColors.gold, fontSize: 15, fontWeight: '600' },
  logo:        { fontSize: 32, fontWeight: '800', color: JihColors.gold, letterSpacing: -1 },
  title:       { fontSize: 22, fontWeight: '800', color: JihColors.white, lineHeight: 28 },
  subtitle:    { fontSize: 14, color: JihColors.muted, lineHeight: 20 },
  errorBox:    { backgroundColor: 'rgba(220,38,38,0.15)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)' },
  errorText:   { color: '#fc8181', fontSize: 14 },
  successBox:  { backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  successText: { color: '#4ade80', fontSize: 14 },
  note:        { backgroundColor: JihColors.navyM, borderRadius: 10, padding: 12 },
  noteText:    { color: JihColors.muted, fontSize: 13, lineHeight: 18 },
  codeInput:   { backgroundColor: JihColors.navyM, color: JihColors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 18, fontSize: 32, fontWeight: '700', letterSpacing: 10, borderWidth: 1.5, borderColor: JihColors.navyXL, textAlign: 'center' },
  btn:         { backgroundColor: JihColors.gold, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: JihColors.navy, fontWeight: '800', fontSize: 17 },
  ghostBtn:    { borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: JihColors.navyXL },
  ghostBtnText:{ color: JihColors.muted, fontWeight: '600', fontSize: 15 },
  signinRow:   { alignItems: 'center', marginTop: 4 },
  signinText:  { color: JihColors.muted, fontSize: 14 },
  signinLink:  { color: JihColors.gold, fontWeight: '700' },
});
