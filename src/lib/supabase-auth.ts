import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, ALUMNI_PUBLIC_COLUMNS } from './supabase.ts';
import { AlumniProfile, UserRole } from '../types.ts';
import { formatToE164Phone } from '../utils/phone.ts';

const SUPER_ADMIN_EMAILS = new Set([
  'nurulanambashirdamian@gmail.com',
  'nurulanambashir20@gmail.com',
  'admin@ndcalumni.org',
  'bashir@ndcalumni.org',
]);

export function isSuperAdminEmail(email?: string): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return SUPER_ADMIN_EMAILS.has(clean) || clean.includes('admin@');
}

/**
 * Format a database row from public.alumni_profiles into the application's AlumniProfile
 */
export function mapSupabaseRowToAlumniProfile(row: any): AlumniProfile {
  if (!row) {
    throw new Error('Cannot map empty row to AlumniProfile');
  }

  const email = row.email || '';
  const isSuper = isSuperAdminEmail(email);
  const resolvedRole: UserRole = isSuper ? 'admin' : (row.role || 'member');

  return {
    id: Number(row.id),
    userId: Number(row.id),
    authUserId: row.auth_user_id || undefined,
    role: resolvedRole,
    fullName: row.full_name || 'Notredamian Alumnus',
    avatarUrl:
      row.avatar_url ||
      '/ndc-logo.png',
    coverUrl: row.cover_url || undefined,
    batchYear: Number(row.batch_year) || 68,
    session: row.session || undefined,
    collegeRoll: row.college_roll || undefined,
    academicStream: row.academic_stream || 'Science',
    academicGroup: row.academic_group || undefined,
    group: row.academic_stream || 'Science',
    section: row.section || undefined,
    verificationStatus: row.verification_status || 'unverified',
    verificationMethod: row.verification_method || undefined,
    verifiedBy: row.verified_by_profile_id ? [String(row.verified_by_profile_id)] : [],
    vouchesCount: Number(row.vouches_count) || 0,
    vouchTargetCount: Number(row.vouch_target_count) || 2,
    verificationDate: row.verified_at ? String(row.verified_at) : undefined,
    profession: row.profession || 'Alumnus',
    position: row.position || '',
    institution: row.institution || '',
    cadre: row.cadre || undefined,
    specialty: Array.isArray(row.specialty) ? row.specialty : [],
    specialtyOther: row.specialty_other || undefined,
    degree: Array.isArray(row.degree) ? row.degree : ['HSC'],
    city: row.city || 'Dhaka',
    country: row.country || 'Bangladesh',
    latitude: row.latitude ? Number(row.latitude) : undefined,
    longitude: row.longitude ? Number(row.longitude) : undefined,
    lat: row.latitude ? Number(row.latitude) : undefined,
    lng: row.longitude ? Number(row.longitude) : undefined,
    phone: row.phone || undefined,
    phoneOwnershipVerified: Boolean(row.phone_ownership_verified),
    phoneVerifiedAt: row.phone_verified_at ? String(row.phone_verified_at) : undefined,
    phoneVerifiedByProfileId: row.phone_verified_by_profile_id ? Number(row.phone_verified_by_profile_id) : undefined,
    phoneVerificationNotes: row.phone_verification_notes || undefined,
    whatsapp: row.whatsapp || undefined,
    fbLink: row.fb_link || undefined,
    email: email || undefined,
    bio: row.bio || '',
    careerHistory: Array.isArray(row.career_history) ? row.career_history : [],
    badges: Array.isArray(row.badges) ? row.badges : [],
    bloodGroup: row.blood_group || undefined,
    isPublic: Boolean(row.is_public ?? true),
    online: true,
    lastSeen: row.last_seen_at ? String(row.last_seen_at) : 'Just now',
    postsCount: Number(row.posts_count) || 0,
  };
}

/**
 * Fetch or automatically initialize the authenticated user's alumni_profiles record
 */
export async function getOrCreateSupabaseProfile(
  authUser: User,
  extraData?: Partial<AlumniProfile>
): Promise<AlumniProfile | null> {
  if (!isSupabaseConfigured || !authUser?.id) {
    return null;
  }

  try {
    // 1. Check if profile already exists for this auth_user_id
    const { data: existing, error: fetchErr } = await supabase
      .from('alumni_profiles')
      .select(ALUMNI_PUBLIC_COLUMNS)
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (existing && !fetchErr) {
      // Enrich with contact details via authorized RPC
      try {
        const { data: contacts } = await supabase.rpc('get_alumni_contact_details', {
          p_profile_id: (existing as any).id,
        });
        if (contacts && contacts[0]) {
          Object.assign(existing, contacts[0]);
        }
      } catch {
        // graceful fallback if RPC unavailable
      }
      return mapSupabaseRowToAlumniProfile(existing);
    }

    // 2. Otherwise, insert a new record for the authenticated user
    const cleanEmail = (authUser.email || extraData?.email || '').toLowerCase().trim();
    const batchYear = Number(extraData?.batchYear) || 68;
    const normalizedBatch = batchYear > 1900 ? batchYear - 1950 : (batchYear > 0 ? batchYear : 68);

    // Note: RLS policy "alumni_profiles_insert_own" strictly enforces role = 'member' and verification_status = 'unverified'.
    // Admin elevation for super admin emails is resolved dynamically in mapSupabaseRowToAlumniProfile.
    const initialRecord = {
      auth_user_id: authUser.id,
      role: 'member',
      verification_status: 'unverified',
      full_name:
        extraData?.fullName?.trim() ||
        (authUser.user_metadata as any)?.full_name ||
        (authUser.user_metadata as any)?.name ||
        (cleanEmail ? cleanEmail.split('@')[0] : null) ||
        (authUser.phone ? `Alumnus (${authUser.phone})` : 'Notredamian Alumnus'),
      avatar_url:
        extraData?.avatarUrl ||
        (authUser.user_metadata as any)?.avatar_url ||
        (authUser.user_metadata as any)?.picture ||
        '/ndc-logo.png',
      batch_year: normalizedBatch,
      session: extraData?.session || null,
      academic_stream:
        extraData?.academicStream === 'Humanities' || extraData?.academicStream === 'Business Studies'
          ? extraData.academicStream
          : 'Science',
      academic_group:
        (extraData?.academicStream === 'Humanities' || extraData?.academicStream === 'Business Studies')
          ? (extraData?.academicGroup || null)
          : null,
      section: extraData?.section || 'Section A',
      profession: extraData?.profession || 'Alumnus',
      position: extraData?.position || '',
      institution: extraData?.institution || '',
      city: extraData?.city || 'Dhaka',
      country: extraData?.country || 'Bangladesh',
      email: cleanEmail || null,
      phone: extraData?.phone
        ? formatToE164Phone(extraData.phone)
        : ((authUser.user_metadata as any)?.phone ? formatToE164Phone((authUser.user_metadata as any).phone) : (authUser.phone ? formatToE164Phone(authUser.phone) : null)),
      phone_ownership_verified: false,
      whatsapp: extraData?.whatsapp?.trim() || null,
      blood_group: extraData?.bloodGroup || null,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('alumni_profiles')
      .insert(initialRecord)
      .select(ALUMNI_PUBLIC_COLUMNS)
      .single();

    if (insertErr) {
      console.warn('Failed to insert new alumni_profiles record:', insertErr.message);
      return null;
    }

    try {
      const { data: contacts } = await supabase.rpc('get_alumni_contact_details', {
        p_profile_id: (inserted as any).id,
      });
      if (contacts && contacts[0]) {
        Object.assign(inserted, contacts[0]);
      }
    } catch {}

    return mapSupabaseRowToAlumniProfile(inserted);
  } catch (err) {
    console.warn('Error during getOrCreateSupabaseProfile:', err);
    return null;
  }
}
