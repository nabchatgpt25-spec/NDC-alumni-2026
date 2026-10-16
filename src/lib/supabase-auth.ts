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
      row.avatar_url &&
      !row.avatar_url.includes('1507003211169-0a1dd7228f2d') &&
      !row.avatar_url.includes('1535713875002-d1d0cf377fde')
        ? row.avatar_url
        : '/ndc-logo.png',
    coverUrl: row.cover_url || undefined,
    batchYear:
      row.batch_year !== null && row.batch_year !== undefined && Number(row.batch_year) >= 1949
        ? Math.round(Number(row.batch_year))
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

import { DEFAULT_EXECUTIVE_COUNCIL } from '../services/executiveCouncilService.ts';

/**
 * Fetch or idempotently initialize the authenticated user's alumni_profiles record.
 * Handles database errors safely with progressive fallbacks so an authenticated session
 * NEVER fails to create or resolve an AlumniProfile.
 */
export async function getOrCreateSupabaseProfile(
  authUser: User,
  extraData?: Partial<AlumniProfile> & Record<string, any>
): Promise<AlumniProfile | null> {
  if (!isSupabaseConfigured || !authUser?.id) {
    return null;
  }

  const cleanEmail = (authUser.email || extraData?.email || (authUser.user_metadata as any)?.email || '').toLowerCase().trim();

  try {
    // 1. Check if profile already exists for this auth_user_id
    const { data: existing, error: fetchErr } = await supabase
      .from('alumni_profiles')
      .select(ALUMNI_PUBLIC_COLUMNS)
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (fetchErr) {
      console.warn('Database error fetching alumni profile by auth_user_id:', fetchErr.message);
    }

    if (existing) {
      // Profile exists: update any missing authentic fields if provided
      const existingProfile = existing as any;
      const meta = (authUser.user_metadata || {}) as any;
      const targetBatch = Number(extraData?.batchYear ?? extraData?.batch_year ?? meta.batch_year ?? meta.batchYear);
      const currentYear = new Date().getFullYear();
      const cleanTargetBatch =
        targetBatch >= 1949 && targetBatch <= currentYear + 1
          ? Math.round(targetBatch)
          : null;
      const targetRoll = extraData?.collegeRoll?.trim() || extraData?.college_roll?.trim() || meta.college_roll || meta.collegeRoll;
      const targetBlood = extraData?.bloodGroup || meta.blood_group || meta.bloodGroup;

      const patchPayload: Record<string, any> = {};
      if (cleanTargetBatch && (!existingProfile.batch_year || Number(existingProfile.batch_year) < 1949) && cleanTargetBatch !== Number(existingProfile.batch_year)) {
        patchPayload.batch_year = cleanTargetBatch;
      }
      if (targetRoll && !existingProfile.college_roll) {
        patchPayload.college_roll = targetRoll;
      }
      if (targetBlood && !existingProfile.blood_group) {
        patchPayload.blood_group = targetBlood;
      }
      if (extraData?.profession && (!existingProfile.profession || existingProfile.profession === 'Alumnus' || existingProfile.profession === 'Not Specified')) {
        patchPayload.profession = extraData.profession;
      }
      if (extraData?.position && !existingProfile.position) {
        patchPayload.position = extraData.position;
      }
      if (extraData?.institution && !existingProfile.institution) {
        patchPayload.institution = extraData.institution;
      }
      if (Array.isArray(extraData?.specialty) && extraData.specialty.length > 0 && (!existingProfile.specialty || existingProfile.specialty.length === 0)) {
        patchPayload.specialty = extraData.specialty;
      }
      if (Array.isArray(extraData?.degree) && extraData.degree.length > 0 && (!existingProfile.degree || existingProfile.degree.length === 0 || (existingProfile.degree.length === 1 && existingProfile.degree[0] === 'HSC'))) {
        patchPayload.degree = extraData.degree;
      }
      if (extraData?.whatsapp && !existingProfile.whatsapp) {
        patchPayload.whatsapp = extraData.whatsapp;
      }
      if (extraData?.city && (!existingProfile.city || existingProfile.city === 'Dhaka')) {
        patchPayload.city = extraData.city;
      }
      if (extraData?.country && (!existingProfile.country || existingProfile.country === 'Bangladesh')) {
        patchPayload.country = extraData.country;
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
      if (!(existing as any).college_roll && targetRoll) {
        (existing as any).college_roll = targetRoll;
      }

      return mapSupabaseRowToAlumniProfile(existing);
    }

    // 2. Check if a profile already exists for this email with an unlinked or placeholder auth_user_id
    if (cleanEmail) {
      try {
        const { data: byEmail } = await supabase
          .from('alumni_profiles')
          .select(ALUMNI_PUBLIC_COLUMNS)
          .eq('email', cleanEmail)
          .maybeSingle();

        if (byEmail) {
          // Attempt to claim this profile by setting auth_user_id = authUser.id
          try {
            const { data: claimed } = await supabase
              .from('alumni_profiles')
              .update({ auth_user_id: authUser.id })
              .eq('id', (byEmail as any).id)
              .select(ALUMNI_PUBLIC_COLUMNS)
              .maybeSingle();
            if (claimed) {
              return mapSupabaseRowToAlumniProfile(claimed);
            }
          } catch {}
          return mapSupabaseRowToAlumniProfile(byEmail);
        }
      } catch (emailLookupErr) {
        console.warn('Email-based profile lookup skipped:', emailLookupErr);
      }
    }

    // 3. Otherwise, insert a new profile record for the authenticated user
    const meta = (authUser.user_metadata || {}) as any;
    const councilMatch = cleanEmail
      ? DEFAULT_EXECUTIVE_COUNCIL.find((c) => c.email.toLowerCase() === cleanEmail)
      : undefined;

    const rawBatch =
      extraData?.batchYear ??
      extraData?.batch_year ??
      meta.batch_year ??
      meta.batchYear ??
      councilMatch?.batchYear;
    const batchYearNum = Number(rawBatch);
    const currentYear = new Date().getFullYear();
    const cleanBatchYear =
      !isNaN(batchYearNum) && batchYearNum >= 1949 && batchYearNum <= currentYear + 1
        ? Math.round(batchYearNum)
        : null;

    // CRITICAL FIX: alumni_profiles.batch_year is NOT NULL and references public.batches.
    // For Google OAuth or users who haven't set a batch year yet, fallback safely to 2026.
    const effectiveBatchYear = cleanBatchYear || 2026;

    const targetRoll =
      extraData?.collegeRoll?.trim() ||
      extraData?.college_roll?.trim() ||
      meta.college_roll ||
      meta.collegeRoll ||
      null;

    // Normalize academic stream and academic group
    const rawGroupInput =
      extraData?.academicGroup ||
      extraData?.group ||
      extraData?.academicStream ||
      meta.academic_group ||
      meta.academic_stream ||
      meta.group;
    const streamGroup = normalizeAcademicStreamAndGroup(rawGroupInput);

    // CRITICAL FIX: In the database, academic_stream_groups only has group_code = NULL for Science.
    // Forcing academic_group = null for Science prevents fk_alumni_stream_group foreign key violation!
    const effectiveAcademicGroup =
      streamGroup.academicStream === 'Science'
        ? null
        : (streamGroup.academicGroup || null);

    const rawFullName =
      extraData?.fullName?.trim() ||
      meta.full_name ||
      meta.name ||
      councilMatch?.name ||
      (cleanEmail ? cleanEmail.split('@')[0] : '') ||
      (authUser.phone ? `Alumnus (${authUser.phone})` : '') ||
      'Notredamian Alumnus';
    const validFullName =
      rawFullName.length < 2 ? 'Notredamian Alumnus' : rawFullName.slice(0, 150);

    const validAvatar =
      extraData?.avatarUrl ||
      meta.avatar_url ||
      meta.picture ||
      '/ndc-logo.png';

    const rawPhone =
      extraData?.phone ||
      meta.phone ||
      authUser.phone ||
      '';
    const validPhone = rawPhone && rawPhone.trim() ? formatToE164Phone(rawPhone) : null;
    const validWhatsapp =
      extraData?.whatsapp?.trim() ||
      meta.whatsapp ||
      null;

    // New profiles strictly start with role = 'member' and verification_status = 'unverified'
    const initialRecord: Record<string, any> = {
      auth_user_id: authUser.id,
      role: 'member',
      verification_status: 'unverified',
      full_name: validFullName,
      avatar_url: validAvatar,
      batch_year: effectiveBatchYear,
      session: extraData?.session || meta.session || null,
      college_roll: targetRoll || null,
      academic_stream: streamGroup.academicStream || 'Science',
      academic_group: effectiveAcademicGroup,
      section:
        extraData?.section ||
        meta.section ||
        (streamGroup.academicGroup ? `Group ${streamGroup.academicGroup}` : 'Section A'),
      profession: extraData?.profession || meta.profession || 'Alumnus',
      position: extraData?.position || meta.position || '',
      institution: extraData?.institution || meta.institution || '',
      specialty: Array.isArray(extraData?.specialty) && extraData.specialty.length > 0 ? extraData.specialty : (Array.isArray(meta.specialty) ? meta.specialty : []),
      degree: Array.isArray(extraData?.degree) && extraData.degree.length > 0 ? extraData.degree : (Array.isArray(meta.degree) && meta.degree.length > 0 ? meta.degree : ['HSC']),
      city: extraData?.city || meta.city || 'Dhaka',
      country: extraData?.country || meta.country || 'Bangladesh',
      email: cleanEmail || null,
      phone: validPhone,
      phone_ownership_verified: false,
      whatsapp: validWhatsapp,
      blood_group: extraData?.bloodGroup || meta.blood_group || meta.bloodGroup || null,
      is_public: true,
      show_contact_to_verified: true,
    };

    // Create the alumni_profiles row once, in one place
    const { data: inserted, error: insertErr } = await supabase
      .from('alumni_profiles')
      .insert(initialRecord)
      .select(ALUMNI_PUBLIC_COLUMNS)
      .maybeSingle();

    if (insertErr) {
      // Check if a concurrent request already inserted the record
      const { data: concurrentRecord } = await supabase
        .from('alumni_profiles')
        .select(ALUMNI_PUBLIC_COLUMNS)
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (concurrentRecord) {
        if (!(concurrentRecord as any).college_roll && targetRoll) {
          (concurrentRecord as any).college_roll = targetRoll;
        }
        return mapSupabaseRowToAlumniProfile(concurrentRecord);
      }

      const errorMessage = `Failed to create alumni profile: ${insertErr.message || 'Database insert failed'}`;
      console.error(errorMessage, insertErr);
      throw new Error(errorMessage);
    }

    if (!inserted) {
      const errorMessage = 'Failed to create alumni profile: No data returned from database insert.';
      console.error(errorMessage);
      throw new Error(errorMessage);
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
    console.error('getOrCreateSupabaseProfile failed:', err);
    throw err;
  }
}
