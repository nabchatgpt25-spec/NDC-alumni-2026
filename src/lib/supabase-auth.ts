import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, ALUMNI_PUBLIC_COLUMNS } from './supabase.ts';
import { AlumniProfile, UserRole } from '../types.ts';
import { formatToE164Phone } from '../utils/phone.ts';
import { normalizeAcademicStreamAndGroup } from '../utils/academicGroupMapping.ts';

/**
 * Format a database row from public.alumni_profiles into the application's AlumniProfile.
 * Role is strictly authoritative from the database; never elevated via email addresses.
 */
export function mapSupabaseRowToAlumniProfile(row: any): AlumniProfile {
  if (!row) {
    throw new Error('Cannot map empty row to AlumniProfile');
  }

  const email = row.email || '';
  const resolvedRole: UserRole =
    row.role === 'admin' || row.role === 'moderator'
      ? row.role
      : 'member';

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
    batchYear:
      row.batch_year !== null && row.batch_year !== undefined && Number(row.batch_year) > 0
        ? (Number(row.batch_year) > 100 ? Number(row.batch_year) : 1950 + Number(row.batch_year))
        : 0,
    session: row.session || undefined,
    collegeRoll: row.college_roll ? String(row.college_roll).trim() : undefined,
    academicStream: row.academic_stream || 'Science',
    academicGroup: row.academic_group || undefined,
    group: row.academic_group
      ? `${row.academic_stream || 'Science'} ${row.academic_group}`
      : (row.academic_stream || 'Science'),
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
 * Fetch or idempotently initialize the authenticated user's alumni_profiles record.
 * Handles database errors safely without attempting accidental duplicate inserts.
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

    if (fetchErr) {
      console.warn('Database error fetching alumni profile:', fetchErr.message);
      // Safe error handling: Do NOT attempt an insert if SELECT encountered a database error
      return null;
    }

    if (existing) {
      // If existing profile was inserted with fallback values (e.g. batch_year = 68),
      // update it if extraData or user_metadata contains the user's authentic data
      const existingProfile = existing as any;
      const meta = (authUser.user_metadata || {}) as any;
      const targetBatch = Number(extraData?.batchYear ?? extraData?.batch_year ?? meta.batch_year ?? meta.batchYear);
      const normalizedTargetBatch = targetBatch > 1900 ? targetBatch - 1950 : (targetBatch > 0 ? targetBatch : 0);
      const targetRoll = extraData?.collegeRoll?.trim() || extraData?.college_roll?.trim() || meta.college_roll || meta.collegeRoll;
      const targetBlood = extraData?.bloodGroup || meta.blood_group || meta.bloodGroup;

      const patchPayload: Record<string, any> = {};
      if (normalizedTargetBatch && (!existingProfile.batch_year || Number(existingProfile.batch_year) === 68) && normalizedTargetBatch !== Number(existingProfile.batch_year)) {
        patchPayload.batch_year = normalizedTargetBatch;
      }
      if (targetRoll && !existingProfile.college_roll) {
        patchPayload.college_roll = targetRoll;
      }
      if (targetBlood && !existingProfile.blood_group) {
        patchPayload.blood_group = targetBlood;
      }
      if (extraData?.profession && (!existingProfile.profession || existingProfile.profession === 'Alumnus')) {
        patchPayload.profession = extraData.profession;
      }
      if (extraData?.institution && !existingProfile.institution) {
        patchPayload.institution = extraData.institution;
      }

      if (Object.keys(patchPayload).length > 0) {
        try {
          const { data: updatedRow } = await supabase
            .from('alumni_profiles')
            .update(patchPayload)
            .eq('id', existingProfile.id)
            .select(ALUMNI_PUBLIC_COLUMNS)
            .maybeSingle();
          if (updatedRow) {
            Object.assign(existing, updatedRow);
          }
        } catch (patchErr) {
          console.warn('Silent fallback updating existing profile with metadata:', patchErr);
        }
      }

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

      // Guarantee college_roll is retained from metadata/extraData if RPC did not return it
      if (!existing.college_roll && targetRoll) {
        existing.college_roll = targetRoll;
      }

      return mapSupabaseRowToAlumniProfile(existing);
    }

    // 2. Otherwise, insert a new profile record for the authenticated user
    const meta = (authUser.user_metadata || {}) as any;
    const cleanEmail = (authUser.email || extraData?.email || meta.email || '').toLowerCase().trim();
    const rawBatch = extraData?.batchYear ?? extraData?.batch_year ?? meta.batch_year ?? meta.batchYear;
    const batchYearNum = Number(rawBatch);
    const normalizedBatch = batchYearNum > 1900 ? batchYearNum - 1950 : (batchYearNum > 0 ? batchYearNum : 68);
    const targetRoll = extraData?.collegeRoll?.trim() || extraData?.college_roll?.trim() || meta.college_roll || meta.collegeRoll || null;

    // Normalize academic stream and academic group
    const rawGroupInput =
      extraData?.academicGroup ||
      extraData?.group ||
      extraData?.academicStream ||
      meta.academic_group ||
      meta.academic_stream ||
      meta.group;
    const streamGroup = normalizeAcademicStreamAndGroup(rawGroupInput);

    // New profiles strictly start with role = 'member' and verification_status = 'unverified'
    const initialRecord: Record<string, any> = {
      auth_user_id: authUser.id,
      role: 'member',
      verification_status: 'unverified',
      full_name:
        extraData?.fullName?.trim() ||
        meta.full_name ||
        meta.name ||
        (cleanEmail ? cleanEmail.split('@')[0] : null) ||
        (authUser.phone ? `Alumnus (${authUser.phone})` : 'Notredamian Alumnus'),
      avatar_url:
        extraData?.avatarUrl ||
        meta.avatar_url ||
        meta.picture ||
        '/ndc-logo.png',
      batch_year: normalizedBatch,
      session: extraData?.session || meta.session || null,
      college_roll: targetRoll,
      academic_stream: streamGroup.academicStream,
      academic_group: streamGroup.academicGroup,
      section: extraData?.section || meta.section || (streamGroup.academicGroup ? `Group ${streamGroup.academicGroup}` : 'Section A'),
      profession: extraData?.profession || meta.profession || 'Alumnus',
      position: extraData?.position || meta.position || '',
      institution: extraData?.institution || meta.institution || '',
      city: extraData?.city || meta.city || 'Dhaka',
      country: extraData?.country || meta.country || 'Bangladesh',
      email: cleanEmail || null,
      phone: extraData?.phone
        ? formatToE164Phone(extraData.phone)
        : (meta.phone ? formatToE164Phone(meta.phone) : (authUser.phone ? formatToE164Phone(authUser.phone) : null)),
      phone_ownership_verified: false,
      whatsapp: extraData?.whatsapp?.trim() || meta.whatsapp || null,
      blood_group: extraData?.bloodGroup || meta.blood_group || meta.bloodGroup || null,
    };

    let { data: inserted, error: insertErr } = await supabase
      .from('alumni_profiles')
      .insert(initialRecord)
      .select(ALUMNI_PUBLIC_COLUMNS)
      .single();

    // Gracefully handle database trigger if academic_group for Science is not configured
    if (insertErr && (insertErr.message.includes('academic_group') || insertErr.message.includes('stream_group'))) {
      initialRecord.academic_group = null;
      const retry = await supabase
        .from('alumni_profiles')
        .insert(initialRecord)
        .select(ALUMNI_PUBLIC_COLUMNS)
        .single();
      inserted = retry.data;
      insertErr = retry.error;
    }

    // Idempotency check: if duplicate key on auth_user_id, fetch the concurrently inserted record
    if (insertErr) {
      if (insertErr.code === '23505' || insertErr.message.includes('duplicate key')) {
        const { data: secondFetch } = await supabase
          .from('alumni_profiles')
          .select(ALUMNI_PUBLIC_COLUMNS)
          .eq('auth_user_id', authUser.id)
          .maybeSingle();
        if (secondFetch) {
          if (!(secondFetch as any).college_roll && targetRoll) {
            (secondFetch as any).college_roll = targetRoll;
          }
          return mapSupabaseRowToAlumniProfile(secondFetch);
        }
      }
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

    if (!(inserted as any).college_roll && targetRoll) {
      (inserted as any).college_roll = targetRoll;
    }

    return mapSupabaseRowToAlumniProfile(inserted);
  } catch (err) {
    console.warn('Error during getOrCreateSupabaseProfile:', err);
    return null;
  }
}
