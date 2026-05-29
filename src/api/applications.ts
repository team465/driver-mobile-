/**
 * Driver application API — port of DriverApply.tsx logic.
 *
 * Covers:
 *  - Loading an existing draft / rejected application
 *  - Auto-saving a draft between steps
 *  - Uploading documents to Supabase Storage
 *  - Submitting the final application
 *  - Notifying admins + sending confirmation
 */

import { supabase } from '@/lib/supabase';

// ── Constants ─────────────────────────────────────────────────────────────────

export const VEHICLE_TYPES = ['tuktuk', 'car', 'moto', 'van'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_BRANDS = [
  'Toyota', 'Honda', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Isuzu',
  'Ford', 'Nissan', 'Suzuki', 'Yamaha', 'Kawasaki', 'Piaggio',
] as const;

export const BRAND_MODELS: Record<string, string[]> = {
  Toyota: ['Camry', 'Corolla', 'Hilux', 'Fortuner', 'Vios', 'Yaris', 'Land Cruiser'],
  Honda:  ['City', 'Civic', 'Jazz', 'CR-V', 'HR-V', 'Wave', 'Dream'],
  Yamaha: ['Mio', 'NMax', 'Exciter', 'Fino'],
};

export const BANKS = ['Wing', 'ABA'] as const;

export const COMM_NEEDS_OPTIONS = [
  { value: 'none',             label: 'No communication needs' },
  { value: 'cant_speak',       label: "Can't speak" },
  { value: 'deaf',             label: 'Deaf' },
  { value: 'hard_of_hearing',  label: 'Hard of hearing' },
  { value: 'prefer_text',      label: 'Prefer text only' },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DriverApplicationData {
  // Personal
  fullName:           string;
  dateOfBirth:        string | null;   // 'YYYY-MM-DD'
  nationalIdNumber:   string;
  phone:              string;
  address:            string;
  city:               string;
  languages:          string[];
  communicationNeeds: string[];
  speaksEnglish:      boolean;
  speaksKhmer:        boolean;
  touristFriendly:    boolean;
  disabilitySupport:  boolean;
  // Vehicle
  vehicleType:        string;
  vehicleBrand:       string;
  vehicleModel:       string;
  vehicleColor:       string;
  plateNumber:        string;
  vehicleYear:        string;
  yearsExperience:    string;
  // Bank
  bankName:           string;
  bankAccountNumber:  string;
  bankAccountHolder:  string;
}

export interface ExistingApplication {
  id:                  string;
  status:              string;
  resubmission_count:  number;
  data:                DriverApplicationData;
  uploadedUrls:        Record<string, string>;
}

// ── Load existing draft / rejected application ────────────────────────────────

export async function getExistingApplication(
  userId: string
): Promise<ExistingApplication | null> {
  const { data } = await supabase
    .from('driver_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const src = data.draft_data && data.status === 'draft'
    ? (data.draft_data as any)
    : data;

  const appData: DriverApplicationData = {
    fullName:           src.full_name         || '',
    dateOfBirth:        src.date_of_birth     || null,
    nationalIdNumber:   src.national_id_number|| '',
    phone:              src.phone             || '',
    address:            src.address           || '',
    city:               src.city              || '',
    languages:          src.languages_spoken  || [],
    communicationNeeds: src.communication_needs || [],
    speaksEnglish:      !!src.speaks_english,
    speaksKhmer:        !!src.speaks_khmer,
    touristFriendly:    !!src.tourist_friendly,
    disabilitySupport:  !!src.disability_support,
    vehicleType:        src.vehicle_type      || '',
    vehicleBrand:       src.vehicle_brand     || '',
    vehicleModel:       src.vehicle_model     || '',
    vehicleColor:       src.vehicle_color     || '',
    plateNumber:        src.plate_number      || '',
    vehicleYear:        src.vehicle_year?.toString() || '',
    yearsExperience:    src.years_experience?.toString() || '',
    bankName:           src.bank_name         || '',
    bankAccountNumber:  src.bank_account_number || '',
    bankAccountHolder:  src.bank_account_holder || '',
  };

  const DOC_KEYS: Array<[string, string]> = [
    ['nric',                'nric_url'],
    ['license',             'license_photo_url'],
    ['vehicleIdCard',       'vehicle_id_card_url'],
    ['technicalInspection', 'technical_inspection_url'],
    ['taxiLicense',         'taxi_license_url'],
    ['vaccinationCard',     'vaccination_card_url'],
    ['vehiclePhoto',        'vehicle_photo_url'],
  ];
  const uploadedUrls: Record<string, string> = {};
  DOC_KEYS.forEach(([key, col]) => {
    const val = (data as any)[col];
    if (val && typeof val === 'string') uploadedUrls[key] = val;
  });

  return {
    id:                 data.id,
    status:             data.status,
    resubmission_count: data.resubmission_count || 0,
    data:               appData,
    uploadedUrls,
  };
}

// ── Auto-save draft ───────────────────────────────────────────────────────────

export async function saveDraft(
  userId: string,
  existingId: string | null,
  appData: DriverApplicationData
): Promise<string> {
  const draftData = {
    full_name:           appData.fullName,
    date_of_birth:       appData.dateOfBirth,
    national_id_number:  appData.nationalIdNumber,
    phone:               appData.phone,
    address:             appData.address,
    city:                appData.city,
    languages_spoken:    appData.languages,
    communication_needs: appData.communicationNeeds,
    vehicle_type:        appData.vehicleType,
    vehicle_brand:       appData.vehicleBrand,
    vehicle_model:       appData.vehicleModel,
    vehicle_color:       appData.vehicleColor,
    plate_number:        appData.plateNumber,
    vehicle_year:        appData.vehicleYear ? parseInt(appData.vehicleYear) : null,
    years_experience:    appData.yearsExperience ? parseInt(appData.yearsExperience) : null,
    bank_name:           appData.bankName,
    bank_account_number: appData.bankAccountNumber,
    bank_account_holder: appData.bankAccountHolder,
  };

  if (existingId) {
    await supabase
      .from('driver_applications')
      .update({ draft_data: draftData as any })
      .eq('id', existingId);
    return existingId;
  }

  const { data, error } = await supabase
    .from('driver_applications')
    .insert({
      user_id:    userId,
      status:     'draft',
      draft_data: draftData as any,
      full_name:  appData.fullName,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// ── Upload a document file ────────────────────────────────────────────────────

export async function uploadDriverDocument(
  userId: string,
  docKey: string,
  fileUri: string,
  mimeType: string
): Promise<string> {
  const ext  = mimeType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${docKey}-${Date.now()}.${ext}`;

  const response  = await fetch(fileUri);
  const blob      = await response.blob();

  const { data, error } = await supabase.storage
    .from('driver-docs')
    .upload(path, blob, { contentType: mimeType, upsert: true });
  if (error) throw error;
  return data.path;
}

// ── Upload profile photo ──────────────────────────────────────────────────────

export async function uploadProfilePhoto(userId: string, fileUri: string, mimeType: string): Promise<string> {
  const ext      = mimeType.split('/')[1] ?? 'jpg';
  const filePath = `${userId}/avatar.${ext}`;

  const response = await fetch(fileUri);
  const blob     = await response.blob();

  await supabase.storage.from('avatars').upload(filePath, blob, { contentType: mimeType, upsert: true });

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const finalUrl = `${publicUrl}?t=${Date.now()}`;

  await supabase.from('profiles').update({ avatar_url: finalUrl }).eq('id', userId);
  return finalUrl;
}

// ── Submit final application ──────────────────────────────────────────────────

export async function submitDriverApplication(
  userId:             string,
  userEmail:          string | undefined,
  existingId:         string | null,
  resubmissionCount:  number,
  appData:            DriverApplicationData,
  uploadedUrls:       Record<string, string>   // keyed by doc key -> storage path
): Promise<void> {
  const payload = {
    user_id:                   userId,
    full_name:                 appData.fullName,
    date_of_birth:             appData.dateOfBirth,
    national_id_number:        appData.nationalIdNumber,
    phone:                     appData.phone,
    address:                   appData.address,
    city:                      appData.city,
    languages_spoken:          appData.languages,
    communication_needs:       appData.communicationNeeds,
    speaks_english:            appData.speaksEnglish,
    speaks_khmer:              appData.speaksKhmer,
    tourist_friendly:          appData.touristFriendly,
    disability_support:        appData.disabilitySupport,
    vehicle_type:              appData.vehicleType,
    vehicle_brand:             appData.vehicleBrand,
    vehicle_model:             appData.vehicleModel,
    vehicle_color:             appData.vehicleColor,
    plate_number:              appData.plateNumber,
    vehicle_year:              appData.vehicleYear ? parseInt(appData.vehicleYear) : null,
    years_experience:          appData.yearsExperience ? parseInt(appData.yearsExperience) : 0,
    nric_url:                  uploadedUrls.nric                || null,
    license_photo_url:         uploadedUrls.license             || null,
    vehicle_id_card_url:       uploadedUrls.vehicleIdCard       || null,
    technical_inspection_url:  uploadedUrls.technicalInspection || null,
    taxi_license_url:          uploadedUrls.taxiLicense         || null,
    vaccination_card_url:      uploadedUrls.vaccinationCard     || null,
    vehicle_photo_url:         uploadedUrls.vehiclePhoto        || null,
    bank_name:                 appData.bankName,
    bank_account_number:       appData.bankAccountNumber,
    bank_account_holder:       appData.bankAccountHolder,
    status:                    'pending',
    draft_data:                null,
    resubmission_count:        resubmissionCount + (existingId ? 1 : 0),
  };

  if (existingId) {
    const { error } = await supabase.from('driver_applications').update(payload).eq('id', existingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('driver_applications').insert(payload);
    if (error) throw error;
  }

  // Save communication prefs to profile
  await supabase.from('profiles').update({
    languages_spoken:    appData.languages,
    communication_needs: appData.communicationNeeds,
  } as any).eq('id', userId);

  // Notify admins
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin' as any);

  if (admins?.length) {
    await supabase.from('notifications').insert(
      admins.map((a: any) => ({
        user_id: a.user_id,
        title:   'New Driver Application',
        message: `New driver application submitted by ${appData.fullName}`,
        type:    'new_application',
      }))
    );

    // Email admins
    for (const admin of admins as any[]) {
      const { data: adminProfile } = await supabase
        .from('profiles').select('email').eq('id', admin.user_id).maybeSingle();
      if (adminProfile?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            to:      adminProfile.email,
            subject: 'New Driver Application — Jih',
            html: `
              <h2>New Driver Application</h2>
              <p><strong>${appData.fullName}</strong> has submitted a driver application.</p>
              <p>Vehicle: ${appData.vehicleBrand} ${appData.vehicleModel} (${appData.vehicleType})</p>
              <p>City: ${appData.city}</p>
              <p>Please review it in the admin dashboard.</p>
            `,
          },
        });
      }
    }
  }

  // Confirmation email to driver
  if (userEmail) {
    await supabase.functions.invoke('send-email', {
      body: {
        to:      userEmail,
        subject: 'We received your Jih driver application!',
        html: `
          <h2>Hi ${appData.fullName},</h2>
          <p>Thank you for applying to drive with <strong>Jih</strong>!</p>
          <p>We have received your application and our team will review it within <strong>2-3 business days</strong>.</p>
          <p>We will email you once a decision has been made.</p>
          <br/>
          <p>— The Jih Team</p>
          <p style="color:#888;">support@jisworld.com</p>
        `,
      },
    });
  }
}
