import { useState } from 'react';
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
import { signUp } from '@/api/auth';
import { JihColors } from '@/constants/theme';

export default function SignUpScreen() {
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

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
      await signUp(email.trim().toLowerCase(), password, fullName.trim());
      router.replace('/apply');
    } catch (e: any) {
      const msg: string = e.message ?? '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setErrors({ form: 'An account with this email already exists. Please sign in instead.' });
      } else {
        setErrors({ form: msg || 'Sign up failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>

        <Text style={s.logo}>jih</Text>
        <Text style={s.title}>Create your driver account</Text>
        <Text style={s.subtitle}>Takes 2 minutes. You'll apply to drive next.</Text>

        {errors.form ? <View style={s.formError}><Text style={s.formErrorText}>{errors.form}</Text></View> : null}

        <Field label="Full name"       placeholder="e.g. Dara Chan"       value={fullName}  onChangeText={setFullName}  autoCapitalize="words"  error={errors.fullName} />
        <Field label="Email address"   placeholder="you@example.com"       value={email}     onChangeText={setEmail}     autoCapitalize="none"   keyboardType="email-address" error={errors.email} />
        <Field label="Password"        placeholder="At least 6 characters" value={password}  onChangeText={setPassword}  secureTextEntry         error={errors.password} />
        <Field label="Confirm password" placeholder="Same password again"  value={confirm}   onChangeText={setConfirm}   secureTextEntry         error={errors.confirm} />

        <View style={s.note}>
          <Text style={s.noteText}>🔒 Your information is secure and only used to verify your driver account.</Text>
        </View>

        <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleSignUp} disabled={loading}>
          {loading
            ? <ActivityIndicator color={JihColors.navy} />
            : <Text style={s.btnText}>Create Account & Continue →</Text>
          }
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
  root:          { flex: 1, backgroundColor: JihColors.navy },
  scroll:        { padding: 24, gap: 16, paddingBottom: 48 },
  back:          { marginBottom: 8, marginTop: 40 },
  backText:      { color: JihColors.gold, fontSize: 15, fontWeight: '600' },
  logo:          { fontSize: 32, fontWeight: '800', color: JihColors.gold, letterSpacing: -1 },
  title:         { fontSize: 22, fontWeight: '800', color: JihColors.white, lineHeight: 28 },
  subtitle:      { fontSize: 14, color: JihColors.muted, lineHeight: 20 },
  formError:     { backgroundColor: 'rgba(220,38,38,0.15)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)' },
  formErrorText: { color: '#fc8181', fontSize: 14 },
  note:          { backgroundColor: JihColors.navyM, borderRadius: 10, padding: 12 },
  noteText:      { color: JihColors.muted, fontSize: 13, lineHeight: 18 },
  btn:           { backgroundColor: JihColors.gold, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 4 },
  btnDisabled:   { opacity: 0.6 },
  btnText:       { color: JihColors.navy, fontWeight: '800', fontSize: 17 },
  signinRow:     { alignItems: 'center', marginTop: 4 },
  signinText:    { color: JihColors.muted, fontSize: 14 },
  signinLink:    { color: JihColors.gold, fontWeight: '700' },
});
