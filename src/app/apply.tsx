/**
 * 4-step driver application — mirrors DriverApply.tsx from jihwolrd.
 * Step 1: About You · Step 2: Your Vehicle · Step 3: Documents & Bank · Step 4: Review & Submit
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import JihDriverLogo from '@/components/JihDriverLogo';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import {
  getExistingApplication,
  saveDraft,
  submitDriverApplication,
  uploadDriverDocument,
  type DriverApplicationData,
} from '@/api/applications';
import { JihColors } from '@/constants/theme';

// ── Constants ──────────────────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  { key: 'tuktuk', label: 'Tuk Tuk', icon: '🛺' },
  { key: 'car',    label: 'Car',     icon: '🚗' },
  { key: 'moto',   label: 'Moto',    icon: '🏍️' },
  { key: 'van',    label: 'Van',     icon: '🚐' },
] as const;

const LANGUAGES = ['English', 'ខ្មែរ (Khmer)', '中文 (Chinese)', '한국어 (Korean)', '日本語 (Japanese)', 'Français', 'Deutsch'];

const DOC_FIELDS: Array<{ key: string; label: string; carOnly?: boolean }> = [
  { key: 'nric',                label: 'National ID Card (NRIC)' },
  { key: 'license',             label: 'Driving License' },
  { key: 'vehicleIdCard',       label: 'Vehicle Identity Card' },
  { key: 'technicalInspection', label: 'Vehicle Inspection Certificate' },
  { key: 'taxiLicense',         label: 'Taxi Business License', carOnly: true },
  { key: 'vaccinationCard',     label: 'Vaccination Card' },
  { key: 'vehiclePhoto',        label: 'Photo of Your Vehicle' },
];

const EMPTY: DriverApplicationData = {
  fullName: '', dateOfBirth: null, nationalIdNumber: '',
  phone: '', address: '', city: '', languages: [],
  communicationNeeds: [], speaksEnglish: false, speaksKhmer: false,
  touristFriendly: false, disabilitySupport: false,
  vehicleType: '', vehicleBrand: '', vehicleModel: '',
  vehicleColor: '', plateNumber: '', vehicleYear: '', yearsExperience: '',
  bankName: '', bankAccountNumber: '', bankAccountHolder: '',
};

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function ApplyScreen() {
  const { user, profile } = useAuth();
  const [step,         setStep]         = useState(1);
  const [data,         setData]         = useState<DriverApplicationData>(EMPTY);
  const [docFiles,     setDocFiles]     = useState<Record<string, { uri: string; name: string }>>({});
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [loading,      setLoading]      = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [existingId,   setExistingId]   = useState<string | null>(null);
  const [resubCount,   setResubCount]   = useState(0);
  const [agreed,       setAgreed]       = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const set = (key: keyof DriverApplicationData, val: any) =>
    setData(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      const existing = await getExistingApplication(user.id);
      if (existing) {
        setExistingId(existing.id);
        setResubCount(existing.resubmission_count);
        setData({ ...existing.data, fullName: existing.data.fullName || profile?.full_name || '' });
        setUploadedUrls(existing.uploadedUrls);
      } else {
        setData(prev => ({ ...prev, fullName: profile?.full_name || '', phone: profile?.phone || '' }));
      }
      setInitializing(false);
    })();
  }, [user, profile]);

  // ── Validation ────────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!data.fullName.trim())       e.fullName  = 'Full name is required.';
      if (!data.phone.trim())          e.phone     = 'Phone number is required.';
      if (!data.address.trim())        e.address   = 'Address is required.';
      if (!data.city.trim())           e.city      = 'City is required.';
      if (data.languages.length === 0) e.languages = 'Select at least one language.';
    }
    if (step === 2) {
      if (!data.vehicleType)           e.vehicleType  = 'Select your vehicle type.';
      if (!data.vehicleBrand.trim())   e.vehicleBrand = 'Vehicle brand is required.';
      if (!data.vehicleModel.trim())   e.vehicleModel = 'Vehicle model is required.';
      if (!data.vehicleColor.trim())   e.vehicleColor = 'Vehicle color is required.';
      if (!data.plateNumber.trim())    e.plateNumber  = 'Plate number is required.';
    }
    if (step === 3) {
      DOC_FIELDS.filter(d => !d.carOnly || data.vehicleType === 'car').forEach(d => {
        if (!docFiles[d.key] && !uploadedUrls[d.key]) e[d.key] = `Upload your ${d.label}.`;
      });
      if (!data.bankName)                 e.bankName          = 'Select your bank.';
      if (!data.bankAccountNumber.trim()) e.bankAccountNumber = 'Account number is required.';
      if (!data.bankAccountHolder.trim()) e.bankAccountHolder = 'Account holder name is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) { scrollRef.current?.scrollTo({ y: 0, animated: true }); return; }
    if (user) {
      const id = await saveDraft(user.id, existingId, data).catch(() => existingId);
      if (id && !existingId) setExistingId(id as string);
    }
    setStep(s => s + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBack = () => { setErrors({}); setStep(s => s - 1); scrollRef.current?.scrollTo({ y: 0, animated: true }); };

  const pickDoc = async (key: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload your documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setDocFiles(prev => ({ ...prev, [key]: { uri: asset.uri, name: asset.fileName ?? `${key}.jpg` } }));
      setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const urls: Record<string, string> = { ...uploadedUrls };
      for (const doc of DOC_FIELDS) {
        const file = docFiles[doc.key];
        if (file) urls[doc.key] = await uploadDriverDocument(user.id, doc.key, file.uri, 'image/jpeg');
      }
      await submitDriverApplication(user.id, user.email, existingId, resubCount, data, urls);
      router.replace('/pending');
    } catch (e: any) {
      Alert.alert('Submission failed', e.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) return <View style={s.center}><ActivityIndicator color={JihColors.gold} size="large" /></View>;

  const visibleDocs = DOC_FIELDS.filter(d => !d.carOnly || data.vehicleType === 'car');

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Back button */}
        <Pressable style={s.topBackBtn} onPress={() => step > 1 ? handleBack() : router.canGoBack() ? router.back() : router.replace('/signup')}>
          <Text style={s.topBackBtnText}>← Back</Text>
        </Pressable>

        {/* Header */}
        <View style={s.header}>
          <JihDriverLogo size="sm" />
          <Text style={s.stepLabel}>Step {step} of 4</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${(step / 4) * 100}%` as any }]} />
        </View>

        {/* ── STEP 1: About You ──────────────────────────────────────────── */}
        {step === 1 && <>
          <StepTitle icon="👋" title="Tell us about yourself" subtitle="This helps us verify your identity as a driver." />

          <Field label="Full name *"    placeholder="e.g. Dara Chan"    value={data.fullName}  onChangeText={v => set('fullName', v)}  autoCapitalize="words" error={errors.fullName} />

          <View style={s.fieldWrap}>
            <Text style={s.label}>Phone number *</Text>
            <View style={s.phoneRow}>
              <View style={s.phonePrefix}><Text style={s.phonePrefixText}>🇰🇭 +855</Text></View>
              <TextInput style={[s.phoneInput, errors.phone ? s.inputError : null]} placeholder="XX XXX XXXX" placeholderTextColor={JihColors.muted} value={data.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
            </View>
            {errors.phone ? <Text style={s.error}>{errors.phone}</Text> : null}
          </View>

          <Field label="Current address *" placeholder="e.g. Pub Street area" value={data.address} onChangeText={v => set('address', v)} error={errors.address} />
          <Field label="City *"            placeholder="e.g. Siem Reap"        value={data.city}    onChangeText={v => set('city', v)}    error={errors.city} />

          <View style={s.fieldWrap}>
            <Text style={s.label}>Languages you speak *</Text>
            <Text style={s.hint}>Passengers want drivers who speak their language</Text>
            <View style={s.chips}>
              {LANGUAGES.map(lang => {
                const sel = data.languages.includes(lang);
                return (
                  <Pressable key={lang} style={[s.chip, sel && s.chipSel]} onPress={() => set('languages', sel ? data.languages.filter(l => l !== lang) : [...data.languages, lang])}>
                    <Text style={[s.chipText, sel && s.chipTextSel]}>{lang}</Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.languages ? <Text style={s.error}>{errors.languages}</Text> : null}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Driver labels (optional)</Text>
            {([
              { key: 'touristFriendly',  icon: 'globe'  as const, label: 'Tourist Friendly' },
              { key: 'disabilitySupport', icon: 'shield' as const, label: 'Disability Friendly' },
            ]).map(opt => (
              <Pressable key={opt.key} style={s.checkRow} onPress={() => set(opt.key as any, !(data as any)[opt.key])}>
                <View style={[s.checkbox, (data as any)[opt.key] && s.checkboxOn]}>
                  {(data as any)[opt.key] && <Text style={s.checkmark}>✓</Text>}
                </View>
                <View style={s.checkLabelRow}>
                  <Feather name={opt.icon} size={15} color="#ffffff" />
                  <Text style={s.checkLabel}>{opt.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>}

        {/* ── STEP 2: Vehicle ──────────────────────────────────────────────── */}
        {step === 2 && <>
          <StepTitle icon="" title="What are you driving?" subtitle="Your vehicle type determines which ride requests you receive." />

          <View style={s.fieldWrap}>
            <Text style={s.label}>Vehicle type *</Text>
            <View style={s.vehicleGrid}>
              {VEHICLE_TYPES.map(vt => (
                <Pressable key={vt.key} style={[s.vehicleCard, data.vehicleType === vt.key && s.vehicleCardSel]} onPress={() => set('vehicleType', vt.key)}>
                  <Text style={[s.vehicleLabel, data.vehicleType === vt.key && s.vehicleLabelSel]}>{vt.label}</Text>
                </Pressable>
              ))}
            </View>
            {errors.vehicleType ? <Text style={s.error}>{errors.vehicleType}</Text> : null}
          </View>

          {data.vehicleType === 'car' && (
            <View style={s.infoBox}><Text style={s.infoText}>🚕 Car drivers need a valid Taxi Business License from the Ministry of Transport.</Text></View>
          )}

          <Field label="Vehicle brand *"    placeholder="e.g. Toyota, Honda, Yamaha" value={data.vehicleBrand}    onChangeText={v => set('vehicleBrand', v)}    autoCapitalize="words" error={errors.vehicleBrand} />
          <Field label="Vehicle model *"    placeholder="e.g. Camry, Dream, NMax"    value={data.vehicleModel}    onChangeText={v => set('vehicleModel', v)}    autoCapitalize="words" error={errors.vehicleModel} />
          <Field label="Vehicle color *"    placeholder="e.g. White, Silver, Red"    value={data.vehicleColor}    onChangeText={v => set('vehicleColor', v)}    autoCapitalize="words" error={errors.vehicleColor} />
          <Field label="Plate number *"     placeholder="e.g. 2A-1234"               value={data.plateNumber}     onChangeText={v => set('plateNumber', v.toUpperCase())} autoCapitalize="characters" error={errors.plateNumber} />
          <Field label="Year of manufacture" placeholder="e.g. 2019"                 value={data.vehicleYear}     onChangeText={v => set('vehicleYear', v)}     keyboardType="numeric" />
          <Field label="Years of experience" placeholder="e.g. 3"                    value={data.yearsExperience} onChangeText={v => set('yearsExperience', v)} keyboardType="numeric" />
        </>}

        {/* ── STEP 3: Documents & Bank ───────────────────────────────────── */}
        {step === 3 && <>
          <StepTitle icon="📄" title="Documents & bank details" subtitle="Upload clear photos. Blurry or expired documents delay approval." />

          {visibleDocs.map(doc => {
            const done = docFiles[doc.key] || uploadedUrls[doc.key];
            return (
              <View key={doc.key} style={s.fieldWrap}>
                <Text style={s.label}>{doc.label} *</Text>
                <Pressable style={[s.docBtn, done ? s.docBtnDone : null, errors[doc.key] ? s.docBtnError : null]} onPress={() => pickDoc(doc.key)}>
                  <Feather name={done ? 'check-circle' : 'camera'} size={20} color={done ? '#22c55e' : '#9ca3af'} style={s.docBtnIcon} />
                  <Text style={[s.docBtnText, done ? s.docBtnTextDone : null]} numberOfLines={1}>
                    {done ? (docFiles[doc.key]?.name ?? 'Previously uploaded — tap to change') : 'Tap to upload photo'}
                  </Text>
                </Pressable>
                {errors[doc.key] ? <Text style={s.error}>{errors[doc.key]}</Text> : null}
              </View>
            );
          })}

          <View style={s.sectionDivider}>
            <View style={s.sectionTitleRow}>
              <Feather name="credit-card" size={16} color={JihColors.white} />
              <Text style={s.sectionTitle}>Bank account for payouts</Text>
            </View>
            <Text style={s.hint}>This is where your earnings will be transferred.</Text>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Bank *</Text>
            <View style={s.bankRow}>
              {['Wing', 'ABA'].map(b => (
                <Pressable key={b} style={[s.bankOption, data.bankName === b && s.bankOptionSel]} onPress={() => set('bankName', b)}>
                  <Text style={[s.bankOptionText, data.bankName === b && s.bankOptionTextSel]}>{b}</Text>
                </Pressable>
              ))}
            </View>
            {errors.bankName ? <Text style={s.error}>{errors.bankName}</Text> : null}
          </View>

          <Field label="Account number *"      placeholder="Enter your account number"  value={data.bankAccountNumber} onChangeText={v => set('bankAccountNumber', v)} keyboardType="numeric" error={errors.bankAccountNumber} />
          <Field label="Account holder name *" placeholder="Name on the account"         value={data.bankAccountHolder} onChangeText={v => set('bankAccountHolder', v)} autoCapitalize="words" error={errors.bankAccountHolder} />
        </>}

        {/* ── STEP 4: Review & Submit ────────────────────────────────────── */}
        {step === 4 && <>
          <StepTitle icon="" title="Almost there!" subtitle="Check your details, then submit your application." />

          <ReviewSection title="About you">
            <ReviewRow label="Name"      value={data.fullName} />
            <ReviewRow label="Phone"     value={data.phone} />
            <ReviewRow label="Address"   value={`${data.address}, ${data.city}`} />
            <ReviewRow label="Languages" value={data.languages.join(', ') || '—'} />
          </ReviewSection>

          <ReviewSection title="Vehicle">
            <ReviewRow label="Type"   value={VEHICLE_TYPES.find(v => v.key === data.vehicleType)?.label ?? '—'} />
            <ReviewRow label="Brand"  value={data.vehicleBrand} />
            <ReviewRow label="Model"  value={data.vehicleModel} />
            <ReviewRow label="Color"  value={data.vehicleColor} />
            <ReviewRow label="Plate"  value={data.plateNumber} />
          </ReviewSection>

          <ReviewSection title="Documents">
            {visibleDocs.map(d => {
              const uploaded = !!(docFiles[d.key] || uploadedUrls[d.key]);
              return (
                <View key={d.key} style={rs.row}>
                  <Text style={rs.label}>{d.label}</Text>
                  <View style={rs.statusCell}>
                    <Feather name={uploaded ? 'check-circle' : 'x-circle'} size={13} color={uploaded ? '#22c55e' : '#ef4444'} />
                    <Text style={[rs.value, { color: uploaded ? '#22c55e' : '#ef4444' }]}>{uploaded ? 'Uploaded' : 'Missing'}</Text>
                  </View>
                </View>
              );
            })}
          </ReviewSection>

          <ReviewSection title="Bank">
            <ReviewRow label="Bank"    value={data.bankName || '—'} />
            <ReviewRow label="Account" value={data.bankAccountNumber ? `****${data.bankAccountNumber.slice(-4)}` : '—'} />
            <ReviewRow label="Holder"  value={data.bankAccountHolder || '—'} />
          </ReviewSection>

          <Pressable style={s.agreeRow} onPress={() => setAgreed(v => !v)}>
            <View style={[s.checkbox, agreed && s.checkboxOn]}>
              {agreed && <Text style={s.checkmark}>✓</Text>}
            </View>
            <Text style={s.agreeText}>
              Everything I've shared is accurate. I understand that Jih may ask me to resubmit if anything needs updating.
            </Text>
          </Pressable>

          <Pressable style={[s.submitBtn, (!agreed || loading) && s.submitBtnDisabled]} onPress={handleSubmit} disabled={!agreed || loading}>
            {loading
              ? <ActivityIndicator color={JihColors.navy} />
              : <Text style={s.submitBtnText}>Submit Application →</Text>
            }
          </Pressable>
        </>}

        {/* Nav buttons */}
        <View style={s.navRow}>
          {step > 1 && <Pressable style={s.backBtn} onPress={handleBack}><Text style={s.backBtnText}>← Back</Text></Pressable>}
          {step < 4  && <Pressable style={[s.nextBtn, step === 1 && { flex: 1 }]} onPress={handleNext}><Text style={s.nextBtnText}>Next →</Text></Pressable>}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={st.wrap}>
      {!!icon && <Text style={st.icon}>{icon}</Text>}
      <Text style={st.title}>{title}</Text>
      <Text style={st.sub}>{subtitle}</Text>
    </View>
  );
}
const st = StyleSheet.create({
  wrap:  { alignItems: 'center', gap: 6, marginBottom: 8 },
  icon:  { fontSize: 40 },
  title: { fontSize: 22, fontWeight: '800', color: JihColors.white, textAlign: 'center' },
  sub:   { fontSize: 14, color: JihColors.muted, textAlign: 'center', lineHeight: 20 },
});

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={rs.wrap}><Text style={rs.title}>{title}</Text>{children}</View>;
}
function ReviewRow({ label, value }: { label: string; value: string }) {
  return <View style={rs.row}><Text style={rs.label}>{label}</Text><Text style={rs.value} numberOfLines={2}>{value || '—'}</Text></View>;
}
const rs = StyleSheet.create({
  wrap:  { backgroundColor: JihColors.navyM, borderRadius: 12, padding: 14, gap: 8 },
  title: { color: JihColors.gold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  row:   { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  label: { color: JihColors.muted, fontSize: 13, flex: 1 },
  value:      { color: JihColors.white, fontSize: 13, fontWeight: '500', flex: 2, textAlign: 'right' },
  statusCell: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 2, justifyContent: 'flex-end' },
});

function Field({ label, hint, error, ...props }: { label: string; hint?: string; error?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={ff.wrap}>
      <Text style={ff.label}>{label}</Text>
      {hint && <Text style={ff.hint}>{hint}</Text>}
      <TextInput style={[ff.input, error ? ff.inputError : null]} placeholderTextColor={JihColors.muted} {...props} />
      {error ? <Text style={ff.error}>{error}</Text> : null}
    </View>
  );
}
const ff = StyleSheet.create({
  wrap:       { gap: 5 },
  label:      { color: JihColors.white, fontSize: 14, fontWeight: '600' },
  hint:       { color: JihColors.muted, fontSize: 12 },
  input:      { backgroundColor: JihColors.navyM, color: JihColors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, borderWidth: 1.5, borderColor: JihColors.navyXL },
  inputError: { borderColor: JihColors.destructive },
  error:      { color: '#fc8181', fontSize: 12 },
});

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: JihColors.navy },
  scroll:          { padding: 20, gap: 16, paddingBottom: 60, paddingTop: 12 },
  topBackBtn:      { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 16, marginTop: 36 },
  topBackBtnText:  { color: JihColors.gold, fontSize: 15, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: JihColors.navy },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  logo:         { fontSize: 26, fontWeight: '800', color: JihColors.gold, letterSpacing: -1 },
  stepLabel:    { color: JihColors.muted, fontSize: 14, fontWeight: '600' },
  progressTrack: { height: 4, backgroundColor: JihColors.navyXL, borderRadius: 2, marginBottom: 4 },
  progressFill:  { height: '100%', backgroundColor: JihColors.gold, borderRadius: 2 },

  fieldWrap: { gap: 8 },
  label:     { color: JihColors.white, fontSize: 14, fontWeight: '600' },
  hint:      { color: JihColors.muted, fontSize: 12 },
  error:     { color: '#fc8181', fontSize: 12 },

  phoneRow:        { flexDirection: 'row' },
  phonePrefix:     { backgroundColor: JihColors.navyM, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1.5, borderRightWidth: 0, borderColor: JihColors.navyXL },
  phonePrefixText: { color: JihColors.white, fontSize: 14, fontWeight: '600' },
  phoneInput:      { flex: 1, backgroundColor: JihColors.navyM, color: JihColors.white, borderTopRightRadius: 12, borderBottomRightRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, borderWidth: 1.5, borderColor: JihColors.navyXL },
  inputError:      { borderColor: JihColors.destructive },

  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { borderRadius: 20, borderWidth: 1.5, borderColor: JihColors.navyXL, paddingHorizontal: 14, paddingVertical: 8 },
  chipSel:      { backgroundColor: JihColors.gold + '20', borderColor: JihColors.gold },
  chipText:     { color: JihColors.muted, fontSize: 13, fontWeight: '500' },
  chipTextSel:  { color: JihColors.gold, fontWeight: '700' },

  checkRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  checkbox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: JihColors.navyXL, justifyContent: 'center', alignItems: 'center' },
  checkboxOn:  { backgroundColor: JihColors.gold, borderColor: JihColors.gold },
  checkmark:   { color: JihColors.navy, fontWeight: '800', fontSize: 13 },
  checkLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  checkLabel:  { color: JihColors.white, fontSize: 14 },

  vehicleGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vehicleCard:     { width: '47%', borderRadius: 14, borderWidth: 2, borderColor: JihColors.navyXL, backgroundColor: JihColors.navyM, padding: 16, alignItems: 'center', gap: 6 },
  vehicleCardSel:  { borderColor: JihColors.gold, backgroundColor: JihColors.gold + '15' },
  vehicleIcon:     { fontSize: 32 },
  vehicleLabel:    { color: JihColors.muted, fontSize: 14, fontWeight: '600' },
  vehicleLabelSel: { color: JihColors.gold },

  infoBox:  { backgroundColor: JihColors.gold + '15', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: JihColors.gold + '30' },
  infoText: { color: JihColors.gold, fontSize: 13, lineHeight: 18 },

  docBtn:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: JihColors.navyM, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: JihColors.navyXL, borderStyle: 'dashed' },
  docBtnDone:     { borderColor: '#4ade80', borderStyle: 'solid' },
  docBtnError:    { borderColor: JihColors.destructive },
  docBtnIcon:     { fontSize: 22, width: 28, textAlign: 'center' },
  docBtnText:     { flex: 1, color: JihColors.muted, fontSize: 14 },
  docBtnTextDone: { color: '#4ade80' },

  sectionDivider: { borderTopWidth: 1, borderTopColor: JihColors.navyXL, paddingTop: 16, gap: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:   { color: JihColors.white, fontSize: 16, fontWeight: '700' },

  bankRow:         { flexDirection: 'row', gap: 10 },
  bankOption:      { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: JihColors.navyXL, paddingVertical: 14, alignItems: 'center', backgroundColor: JihColors.navyM },
  bankOptionSel:   { borderColor: JihColors.gold, backgroundColor: JihColors.gold + '15' },
  bankOptionText:  { color: JihColors.muted, fontWeight: '700', fontSize: 16 },
  bankOptionTextSel: { color: JihColors.gold },

  agreeRow:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: JihColors.navyM, borderRadius: 12, padding: 14 },
  agreeText: { flex: 1, color: JihColors.white, fontSize: 13, lineHeight: 20 },

  submitBtn:         { backgroundColor: JihColors.gold, borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:     { color: JihColors.navy, fontWeight: '800', fontSize: 17 },

  navRow:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  backBtn:     { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: JihColors.navyXL, paddingVertical: 14, alignItems: 'center' },
  backBtnText: { color: JihColors.white, fontWeight: '600', fontSize: 15 },
  nextBtn:     { flex: 1, borderRadius: 12, backgroundColor: JihColors.gold, paddingVertical: 14, alignItems: 'center' },
  nextBtnText: { color: JihColors.navy, fontWeight: '800', fontSize: 15 },
});
