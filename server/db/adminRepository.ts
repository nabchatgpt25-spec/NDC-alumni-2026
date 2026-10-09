import {
  supabaseServer,
  isSupabaseServerConfigured,
  SUPABASE_TABLES,
} from '../lib/supabase-server.ts';

export interface ProfileFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  batchYear?: number;
  academicStream?: string;
  verificationStatus?: string;
  role?: string;
  accountStatus?: string;
  bloodGroup?: string;
  includeSensitivePii?: boolean;
}

// Canonical Academic Stream Groups Reference (Batches 01 to 78)
const DEFAULT_STREAM_GROUPS = [
  { id: 1, stream: 'Science', group_code: null, groupCode: null, expected_group_count: 17, expectedGroupCount: 17, is_active: true, isActive: true },
  { id: 2, stream: 'Humanities', group_code: 'G', groupCode: 'G', expected_group_count: 4, expectedGroupCount: 4, is_active: true, isActive: true },
  { id: 3, stream: 'Humanities', group_code: 'H', groupCode: 'H', expected_group_count: 4, expectedGroupCount: 4, is_active: true, isActive: true },
  { id: 4, stream: 'Humanities', group_code: 'L', groupCode: 'L', expected_group_count: 4, expectedGroupCount: 4, is_active: true, isActive: true },
  { id: 5, stream: 'Humanities', group_code: 'W', groupCode: 'W', expected_group_count: 4, expectedGroupCount: 4, is_active: true, isActive: true },
  { id: 6, stream: 'Business Studies', group_code: 'A', groupCode: 'A', expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
  { id: 7, stream: 'Business Studies', group_code: 'B', groupCode: 'B', expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
  { id: 8, stream: 'Business Studies', group_code: 'C', groupCode: 'C', expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
  { id: 9, stream: 'Business Studies', group_code: 'D', groupCode: 'D', expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
  { id: 10, stream: 'Business Studies', group_code: 'E', groupCode: 'E', expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
  { id: 11, stream: 'Business Studies', group_code: 'F', groupCode: 'F', expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
];

export const inMemoryAlumniProfiles: any[] = [];

export async function recordSecurityAuditLog(params: {
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  severity?: 'info' | 'warning' | 'critical';
  summary: string;
}) {
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer
        .from(SUPABASE_TABLES.AUDIT_LOGS)
        .insert({
          actor_auth_id: params.actorUid,
          action: params.action,
          entity_table: params.targetType,
          entity_id: params.targetId,
          reason: params.summary,
        })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase audit log insert error:', err);
    }
  }
  return {
    id: Date.now(),
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    action: params.action,
    summary: params.summary,
    createdAt: new Date(),
  };
}

export async function validateAcademicStreamAndGroup(
  stream: string,
  groupCode?: string | null
): Promise<{ valid: boolean; reason?: string }> {
  const cleanStream = (stream || 'Science').trim();
  const cleanGroup = groupCode ? groupCode.trim().toUpperCase() : null;

  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer
        .from(SUPABASE_TABLES.ACADEMIC_STREAM_GROUPS)
        .select('*')
        .eq('stream', cleanStream)
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        if (!cleanGroup) return { valid: true };
        const match = data.find(
          (r: any) => r.group_code && r.group_code.toUpperCase() === cleanGroup
        );
        if (match) return { valid: true };
        const allowed = data
          .map((r: any) => r.group_code)
          .filter(Boolean)
          .join(', ');
        return {
          valid: false,
          reason: `Invalid group "${cleanGroup}" for stream "${cleanStream}". Allowed: ${allowed || 'None'}.`,
        };
      }
    } catch (err) {
      console.warn('Supabase stream validation error, using reference rules:', err);
    }
  }

  // Reference validation
  const streamRows = DEFAULT_STREAM_GROUPS.filter(
    (g) => g.stream.toLowerCase() === cleanStream.toLowerCase() && g.is_active
  );
  if (streamRows.length === 0) {
    return {
      valid: false,
      reason: `Academic stream "${cleanStream}" is not active in the institutional registry.`,
    };
  }
  if (!cleanGroup) return { valid: true };
  const match = streamRows.find(
    (g) => g.group_code && g.group_code.toUpperCase() === cleanGroup
  );
  if (!match) {
    const allowed = streamRows.map((g) => g.group_code).filter(Boolean).join(', ');
    return {
      valid: false,
      reason: `Invalid group "${cleanGroup}" for stream "${cleanStream}". Allowed: ${allowed || 'None'}.`,
    };
  }
  return { valid: true };
}

export async function getAcademicStreamGroupsConfig() {
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer
        .from(SUPABASE_TABLES.ACADEMIC_STREAM_GROUPS)
        .select('*')
        .order('stream')
        .order('group_code');
      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          stream: r.stream,
          groupCode: r.group_code,
          expectedGroupCount: r.expected_group_count,
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase getAcademicStreamGroupsConfig error:', err);
    }
  }
  return DEFAULT_STREAM_GROUPS;
}

export async function toggleAcademicStreamGroupActive(params: {
  id: number;
  isActive: boolean;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer
        .from(SUPABASE_TABLES.ACADEMIC_STREAM_GROUPS)
        .update({
          is_active: params.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single();
      if (!error && data) {
        return {
          id: data.id,
          stream: data.stream,
          groupCode: data.group_code,
          expectedGroupCount: data.expected_group_count,
          isActive: data.is_active,
        };
      }
    } catch (err) {
      console.warn('Supabase toggleAcademicStreamGroupActive error:', err);
    }
  }

  const found = DEFAULT_STREAM_GROUPS.find((g) => g.id === params.id);
  if (!found) throw new Error('Academic stream group row not found.');
  found.is_active = params.isActive;
  found.isActive = params.isActive;
  return found;
}

export async function getAdminOverviewMetrics() {
  let totalProfiles = 0;
  let verifiedProfiles = 0;
  let pendingProfiles = 0;
  let suspendedProfiles = 0;
  let registeredDonors = 0;
  let pendingDocReviews = 0;
  let activeBloodEmergencies = 0;
  let publishedNotices = 0;
  let scienceCount = 0;
  let humanitiesCount = 0;
  let businessCount = 0;
  let streamGroupsConfig: any[] = DEFAULT_STREAM_GROUPS;
  let recentAuditLogs: any[] = [];

  if (isSupabaseServerConfigured) {
    try {
      const [
        totalRes,
        verifiedRes,
        pendingRes,
        suspendedRes,
        donorsRes,
        pendingDocsRes,
        bloodRes,
        noticesRes,
        streamConfigRes,
        auditLogsRes,
        sciRes,
        humRes,
        busRes,
      ] = await Promise.all([
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select('id', { count: 'exact', head: true }),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select('id', { count: 'exact', head: true }).eq('verification_status', 'pending_vouch'),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select('id', { count: 'exact', head: true }).eq('is_public', false),
        supabaseServer.from(SUPABASE_TABLES.BLOOD_DONORS).select('user_id', { count: 'exact', head: true }).eq('is_registered_donor', true),
        supabaseServer.from(SUPABASE_TABLES.ADMIN_DOC_SUBMISSIONS).select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabaseServer.from(SUPABASE_TABLES.BLOOD_REQUESTS).select('id', { count: 'exact', head: true }).in('status', ['Active', 'Pending Verification']),
        supabaseServer.from(SUPABASE_TABLES.OFFICIAL_NOTICES).select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabaseServer.from(SUPABASE_TABLES.ACADEMIC_STREAM_GROUPS).select('*').order('stream').order('group_code'),
        supabaseServer.from(SUPABASE_TABLES.AUDIT_LOGS).select('*').order('created_at', { ascending: false }).limit(15),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select('id', { count: 'exact', head: true }).eq('academic_stream', 'Science'),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select('id', { count: 'exact', head: true }).eq('academic_stream', 'Humanities'),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select('id', { count: 'exact', head: true }).eq('academic_stream', 'Business Studies'),
      ]);

      totalProfiles = totalRes.count ?? 0;
      verifiedProfiles = verifiedRes.count ?? 0;
      pendingProfiles = pendingRes.count ?? 0;
      suspendedProfiles = suspendedRes.count ?? 0;
      registeredDonors = donorsRes.count ?? 0;
      pendingDocReviews = pendingDocsRes.count ?? 0;
      activeBloodEmergencies = bloodRes.count ?? 0;
      publishedNotices = noticesRes.count ?? 0;
      scienceCount = sciRes.count ?? 0;
      humanitiesCount = humRes.count ?? 0;
      businessCount = busRes.count ?? 0;

      if (streamConfigRes.data && streamConfigRes.data.length > 0) {
        streamGroupsConfig = streamConfigRes.data.map((r: any) => ({
          id: r.id,
          stream: r.stream,
          groupCode: r.group_code,
          expectedGroupCount: r.expected_group_count,
          isActive: r.is_active,
        }));
      }

      if (auditLogsRes.data && auditLogsRes.data.length > 0) {
        recentAuditLogs = auditLogsRes.data.map((r: any) => ({
          id: r.id,
          actorUid: r.actor_auth_id || 'system',
          actorEmail: r.actor_auth_id || 'admin@ndcalumni.org',
          actorRole: 'admin',
          action: r.action,
          targetType: r.entity_table,
          targetId: r.entity_id,
          severity: 'info',
          summary: r.reason || r.action,
          createdAt: r.created_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase overview metrics error:', err);
    }
  }

  return {
    totalProfiles,
    verifiedProfiles,
    pendingProfiles,
    suspendedProfiles,
    registeredDonors,
    pendingDocReviews,
    activeBloodEmergencies,
    publishedNotices,
    streamDistribution: {
      Science: scienceCount,
      Humanities: humanitiesCount,
      'Business Studies': businessCount,
    },
    streamGroupsConfig,
    recentAuditLogs,
  };
}

export async function queryPaginatedAlumniProfiles(params: ProfileFilterParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 25));
  const offset = (page - 1) * limit;

  if (isSupabaseServerConfigured) {
    try {
      let query = supabaseServer
        .from(SUPABASE_TABLES.ALUMNI_PROFILES)
        .select('*', { count: 'exact' });

      if (params.batchYear && !Number.isNaN(Number(params.batchYear))) {
        query = query.eq('batch_year', Number(params.batchYear));
      }
      if (params.academicStream && params.academicStream !== 'all') {
        query = query.eq('academic_stream', params.academicStream);
      }
      if (params.verificationStatus && params.verificationStatus !== 'all') {
        query = query.eq('verification_status', params.verificationStatus);
      }
      if (params.role && params.role !== 'all') {
        query = query.eq('role', params.role);
      }
      if (params.bloodGroup && params.bloodGroup !== 'all') {
        query = query.eq('blood_group', params.bloodGroup);
      }
      if (params.search && params.search.trim()) {
        const s = params.search.trim();
        query = query.or(
          `full_name.ilike.%${s}%,institution.ilike.%${s}%,profession.ilike.%${s}%,city.ilike.%${s}%,college_roll.ilike.%${s}%`
        );
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (!error && data) {
        const total = count ?? data.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const profiles = data.map((r: any) => ({
          id: Number(r.id),
          fullName: r.full_name || 'Notredamian Alumnus',
          avatarUrl: r.avatar_url || '/ndc-logo.png',
          batchYear: Number(r.batch_year) || 68,
          session: r.session || null,
          collegeRoll: r.college_roll || null,
          academicStream: r.academic_stream || 'Science',
          academicGroup: r.academic_group || null,
          section: r.section || null,
          verificationStatus: r.verification_status || 'unverified',
          verificationMethod: r.verification_method || 'two_vouches',
          vouchesCount: Number(r.vouches_count) || 0,
          vouchTargetCount: Number(r.vouch_target_count) || 2,
          verifiedByAdmin: r.verified_by_profile_id ? String(r.verified_by_profile_id) : null,
          profession: r.profession || '',
          position: r.position || '',
          institution: r.institution || '',
          city: r.city || 'Dhaka',
          country: r.country || 'Bangladesh',
          phone: params.includeSensitivePii ? r.phone : (r.phone ? 'Protected' : null),
          phoneOwnershipVerified: Boolean(r.phone_ownership_verified),
          phoneVerifiedAt: r.phone_verified_at || null,
          phoneVerifiedByAdmin: r.phone_verified_by_profile_id ? String(r.phone_verified_by_profile_id) : null,
          phoneVerificationNotes: params.includeSensitivePii ? (r.phone_verification_notes || null) : null,
          whatsapp: params.includeSensitivePii ? r.whatsapp : (r.whatsapp ? 'Protected' : null),
          email: params.includeSensitivePii ? r.email : (r.email ? 'Protected' : null),
          bloodGroup: r.blood_group || null,
          isRegisteredDonor: Boolean(r.is_registered_donor),
          role: r.role || 'member',
          accountStatus: r.is_public ? 'active' : 'suspended',
          createdAt: r.created_at || new Date().toISOString(),
        }));
        return {
          profiles,
          pagination: { page, limit, total, totalPages },
        };
      }
    } catch (err) {
      console.warn('Supabase queryPaginatedAlumniProfiles error:', err);
    }
  }

  // In-memory fallback
  let filtered = [...inMemoryAlumniProfiles];
  if (params.batchYear && !Number.isNaN(Number(params.batchYear))) {
    filtered = filtered.filter((p) => p.batchYear === Number(params.batchYear));
  }
  if (params.academicStream && params.academicStream !== 'all') {
    filtered = filtered.filter((p) => p.academicStream === params.academicStream);
  }
  if (params.verificationStatus && params.verificationStatus !== 'all') {
    filtered = filtered.filter((p) => p.verificationStatus === params.verificationStatus);
  }
  if (params.role && params.role !== 'all') {
    filtered = filtered.filter((p) => p.role === params.role);
  }
  if (params.bloodGroup && params.bloodGroup !== 'all') {
    filtered = filtered.filter((p) => p.bloodGroup === params.bloodGroup);
  }
  if (params.search && params.search.trim()) {
    const s = params.search.trim().toLowerCase();
    filtered = filtered.filter((p) =>
      (p.fullName && p.fullName.toLowerCase().includes(s)) ||
      (p.institution && p.institution.toLowerCase().includes(s)) ||
      (p.profession && p.profession.toLowerCase().includes(s)) ||
      (p.city && p.city.toLowerCase().includes(s)) ||
      (p.collegeRoll && p.collegeRoll.toLowerCase().includes(s))
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const pageProfiles = filtered.slice(offset, offset + limit).map((r) => ({
    ...r,
    phone: params.includeSensitivePii ? r.phone : (r.phone ? 'Protected' : null),
    whatsapp: params.includeSensitivePii ? r.whatsapp : (r.whatsapp ? 'Protected' : null),
    email: params.includeSensitivePii ? r.email : (r.email ? 'Protected' : null),
  }));

  return {
    profiles: pageProfiles,
    pagination: { page, limit, total, totalPages },
  };
}

export async function createOrRegisterAlumniProfile(input: {
  userUid?: string;
  rawPassword?: string;
  fullName: string;
  avatarUrl?: string;
  batchYear: number;
  session?: string;
  collegeRoll?: string;
  academicStream?: string;
  academicGroup?: string | null;
  section?: string;
  profession?: string;
  position?: string;
  institution?: string;
  specialty?: string[];
  degree?: string[];
  city?: string;
  country?: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  passwordHash?: string;
  bloodGroup?: string | null;
  isRegisteredDonor?: boolean;
}) {
  const cleanEmail = (input.email || '').trim().toLowerCase() || null;
  const cleanPhone = (input.phone || '').trim() || null;
  const batchNum = input.batchYear > 1900 ? input.batchYear - 1950 : Number(input.batchYear) || 68;
  const hscYear = 1950 + batchNum;
  const session = input.session || `${hscYear - 2}-${String(hscYear).slice(-2)}`;

  const streamVal =
    input.academicStream === 'Humanities' || input.academicStream === 'Business Studies'
      ? input.academicStream
      : 'Science';

  // Note: Science streams at NDC use Section / Group numbers (1-17), not letter group codes.
  // Database trigger trg_validate_alumni_stream_group requires academic_group to be NULL for Science.
  const groupVal =
    streamVal === 'Science'
      ? null
      : (input.academicGroup ? input.academicGroup.trim().toUpperCase() : null);

  let effectiveAuthUid: string | null = null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (input.userUid && uuidRegex.test(input.userUid)) {
    effectiveAuthUid = input.userUid;
  }

  if (isSupabaseServerConfigured) {
    try {
      // 1. If effectiveAuthUid is not yet a valid UUID, look up or provision in auth.users
      if (!effectiveAuthUid && cleanEmail) {
        const { data: usersData } = await supabaseServer.auth.admin.listUsers();
        const existingAuthUser = (usersData?.users as any[])?.find(
          (u: any) => u.email?.toLowerCase() === cleanEmail
        );

        if (existingAuthUser) {
          effectiveAuthUid = existingAuthUser.id;
          // Auto-confirm user so login across devices is never blocked by unconfirmed email state
          if (!existingAuthUser.email_confirmed_at) {
            await supabaseServer.auth.admin.updateUserById(existingAuthUser.id, {
              email_confirm: true,
            });
          }
        } else if (input.rawPassword || input.passwordHash) {
          const initialPass = input.rawPassword || 'TempPass_' + Date.now();
          const { data: createdAuthUser, error: createAuthErr } =
            await supabaseServer.auth.admin.createUser({
              email: cleanEmail,
              password: initialPass,
              email_confirm: true,
              user_metadata: {
                full_name: input.fullName.trim(),
                batch_year: batchNum,
                phone: cleanPhone,
              },
            });
          if (!createAuthErr && createdAuthUser?.user) {
            effectiveAuthUid = createdAuthUser.user.id;
          }
        }
      }

      // 2. Persist directly into public.alumni_profiles using service_role client
      if (effectiveAuthUid) {
        // Auto-confirm existing user in auth.users
        try {
          await supabaseServer.auth.admin.updateUserById(effectiveAuthUid, {
            email_confirm: true,
          });
        } catch {}

        const { data, error } = await supabaseServer
          .from(SUPABASE_TABLES.ALUMNI_PROFILES)
          .upsert(
            {
              auth_user_id: effectiveAuthUid,
              full_name: input.fullName.trim(),
              avatar_url: input.avatarUrl || '/ndc-logo.png',
              batch_year: batchNum,
              session,
              college_roll: input.collegeRoll?.trim() || null,
              academic_stream: streamVal,
              academic_group: groupVal,
              section: input.section || 'Group 4',
              profession: input.profession || '',
              position: input.position || '',
              institution: input.institution || '',
              specialty: Array.isArray(input.specialty) ? input.specialty : [],
              degree: Array.isArray(input.degree) ? input.degree : ['HSC'],
              city: input.city || 'Dhaka',
              country: input.country || 'Bangladesh',
              phone: cleanPhone,
              whatsapp: input.whatsapp?.trim() || null,
              email: cleanEmail,
              blood_group: input.bloodGroup || null,
              role: 'member',
              verification_status: 'unverified',
              is_public: true,
            },
            { onConflict: 'auth_user_id' }
          )
          .select()
          .single();

        if (!error && data) {
          return {
            id: Number(data.id),
            fullName: data.full_name,
            avatarUrl: data.avatar_url,
            batchYear: data.batch_year,
            session: data.session,
            collegeRoll: data.college_roll,
            academicStream: data.academic_stream,
            academicGroup: data.academic_group,
            section: data.section,
            profession: data.profession,
            position: data.position,
            institution: data.institution,
            city: data.city,
            country: data.country,
            phone: data.phone,
            email: data.email,
            bloodGroup: data.blood_group,
            role: data.role,
            verificationStatus: data.verification_status,
            isPublic: data.is_public,
            createdAt: data.created_at,
          };
        } else if (error) {
          console.warn('Supabase alumni_profiles upsert notice:', error.message);
        }
      }
    } catch (err) {
      console.warn('Supabase createOrRegisterAlumniProfile error:', err);
      throw err;
    }
  }

  throw new Error('Supabase is required to register alumni profiles.');
}

export async function findAlumniByCredential(credential: string) {
  const clean = credential.trim().toLowerCase();
  if (isSupabaseServerConfigured && clean) {
    try {
      let query = supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select('*');
      if (clean.includes('@')) {
        query = query.eq('email', clean);
      } else {
        const cleanDigits = clean.replace(/[^0-9]/g, '');
        query = query.or(`phone.eq.${clean},phone.eq.+88${clean},phone.eq.+880${cleanDigits}`);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        return {
          id: Number(data.id),
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
          batchYear: Number(data.batch_year),
          session: data.session,
          collegeRoll: data.college_roll,
          academicStream: data.academic_stream,
          academicGroup: data.academic_group,
          section: data.section,
          profession: data.profession,
          position: data.position,
          institution: data.institution,
          city: data.city,
          country: data.country,
          phone: data.phone,
          phoneOwnershipVerified: Boolean(data.phone_ownership_verified),
          phoneVerifiedAt: data.phone_verified_at || null,
          phoneVerifiedByProfileId: data.phone_verified_by_profile_id || null,
          phoneVerificationNotes: data.phone_verification_notes || null,
          email: data.email,
          bloodGroup: data.blood_group,
          role: data.role,
          verificationStatus: data.verification_status,
          accountStatus: data.is_public ? 'active' : 'suspended',
          passwordHash: null,
          authUserId: data.auth_user_id || undefined,
          createdAt: data.created_at,
        };
      }

      // Self-healing: If user is registered in auth.users but profile row was missing, restore it now
      if (clean.includes('@')) {
        const { data: usersData } = await supabaseServer.auth.admin.listUsers();
        const matched = (usersData?.users as any[])?.find(
          (u: any) => u.email?.toLowerCase() === clean
        );
        if (matched) {
          if (!matched.email_confirmed_at) {
            await supabaseServer.auth.admin.updateUserById(matched.id, {
              email_confirm: true,
            });
          }
          const restored = await createOrRegisterAlumniProfile({
            userUid: matched.id,
            fullName:
              (matched.user_metadata as any)?.full_name ||
              (matched.user_metadata as any)?.name ||
              clean.split('@')[0],
            batchYear: Number((matched.user_metadata as any)?.batch_year) || 68,
            email: clean,
            phone: (matched.user_metadata as any)?.phone || null,
          });
          return restored;
        }
      }
    } catch (err) {
      console.warn('Supabase findAlumniByCredential error:', err);
    }
  }

  const cleanDigits = clean.replace(/[^0-9]/g, '');
  const found = inMemoryAlumniProfiles.find(
    (p) =>
      (p.email && p.email.toLowerCase() === clean) ||
      (cleanDigits && p.phone && p.phone.replace(/[^0-9]/g, '').endsWith(cleanDigits))
  );

  return found || null;
}

export async function updateAlumniPassword(profileId: number, passwordHash: string) {
  if (isSupabaseServerConfigured && profileId) {
    try {
      await supabaseServer
        .from(SUPABASE_TABLES.ALUMNI_PROFILES)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', profileId);
      return true;
    } catch (err) {
      console.warn('Supabase updateAlumniPassword error:', err);
    }
  }

  const found = inMemoryAlumniProfiles.find((p) => p.id === profileId);
  if (found) {
    found.passwordHash = passwordHash;
  }
  return true;
}

export async function deleteAlumniProfile(profileId: number) {
  if (isSupabaseServerConfigured && profileId) {
    try {
      const { error } = await supabaseServer
        .from(SUPABASE_TABLES.ALUMNI_PROFILES)
        .delete()
        .eq('id', profileId);
      return !error;
    } catch (err) {
      console.warn('Supabase deleteAlumniProfile error:', err);
    }
  }

  const idx = inMemoryAlumniProfiles.findIndex((p) => p.id === profileId);
  if (idx !== -1) {
    inMemoryAlumniProfiles.splice(idx, 1);
  }
  return true;
}

export async function adminUpdateAlumniGovernance(params: {
  profileId: number;
  verificationStatus?: string;
  role?: string;
  accountStatus?: string;
  academicStream?: string;
  academicGroup?: string | null;
  adminReviewNote?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  if (params.role !== undefined) {
    const supportedRoles = ['member', 'moderator', 'admin'];
    if (params.actorRole !== 'admin' || !supportedRoles.includes(params.role)) {
      throw new Error('Only administrators may assign supported database roles.');
    }
  }

  if (params.verificationStatus !== undefined && isSupabaseServerConfigured) {
    const { data: target, error: targetError } = await supabaseServer
      .from(SUPABASE_TABLES.ALUMNI_PROFILES)
      .select('auth_user_id, role')
      .eq('id', params.profileId)
      .maybeSingle();
    if (targetError || !target) throw new Error('Alumni profile not found.');
    if (target.auth_user_id === params.actorUid) {
      throw new Error('Administrators cannot change their own verification status.');
    }
    if (target.role === 'admin' && params.actorRole !== 'admin') {
      throw new Error('Only administrators may change an administrator profile.');
    }
  }

  if (isSupabaseServerConfigured && params.profileId) {
    try {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (params.verificationStatus) updates.verification_status = params.verificationStatus;
      if (params.role) updates.role = params.role;
      if (params.academicStream) updates.academic_stream = params.academicStream;
      if (params.academicGroup !== undefined) updates.academic_group = params.academicGroup;
      if (params.accountStatus !== undefined) updates.is_public = params.accountStatus !== 'suspended';

      const { data, error } = await supabaseServer
        .from(SUPABASE_TABLES.ALUMNI_PROFILES)
        .update(updates)
        .eq('id', params.profileId)
        .select()
        .single();

      if (!error && data) {
        await recordSecurityAuditLog({
          actorUid: params.actorUid,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: 'UPDATE_PROFILE_GOVERNANCE',
          targetType: 'alumni_profile',
          targetId: String(params.profileId),
          severity: 'info',
          summary: `Updated profile governance for ${data.full_name} (ID ${data.id}).`,
        });
        return {
          id: Number(data.id),
          fullName: data.full_name,
          verificationStatus: data.verification_status,
          role: data.role,
          accountStatus: data.is_public ? 'active' : 'suspended',
          academicStream: data.academic_stream,
          academicGroup: data.academic_group,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn('Supabase adminUpdateAlumniGovernance error:', err);
      throw err;
    }
  }

  throw new Error('Supabase is required to update profile governance.');
}

export async function adminVerifyAlumniPhoneOwnership(params: {
  profileId: number;
  notes?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  const profileId = Number(params.profileId);
  const now = new Date().toISOString();

  if (isSupabaseServerConfigured && profileId) {
    try {
      // 1. Fetch target profile
      const { data: profile, error: fetchErr } = await supabaseServer
        .from(SUPABASE_TABLES.ALUMNI_PROFILES)
        .select('*')
        .eq('id', profileId)
        .single();

      if (fetchErr || !profile) {
        throw new Error('Alumni profile not found.');
      }
      if (profile.auth_user_id === params.actorUid) {
        throw new Error('Administrators cannot verify their own phone ownership.');
      }

      const rawPhone = (profile.phone || '').trim();
      if (!rawPhone) {
        throw new Error('Alumnus does not have a registered mobile number to verify.');
      }

      // Format to standard E.164
      const normalizedPhone = rawPhone.startsWith('+')
        ? rawPhone.replace(/[^\d+]/g, '')
        : rawPhone.replace(/\D/g, '').startsWith('880')
        ? `+${rawPhone.replace(/\D/g, '')}`
        : `+880${rawPhone.replace(/\D/g, '').replace(/^0+/, '')}`;

      // 2. Check if another profile already has this phone verified
      const { data: duplicate } = await supabaseServer
        .from(SUPABASE_TABLES.ALUMNI_PROFILES)
        .select('id, full_name')
        .eq('phone', normalizedPhone)
        .eq('phone_ownership_verified', true)
        .neq('id', profileId)
        .maybeSingle();

      if (duplicate) {
        throw new Error(
          `This phone number (${normalizedPhone}) is already verified for another alumnus (${duplicate.full_name}, ID: ${duplicate.id}). Dual-account phone reuse is prohibited.`
        );
      }

      // 3. Update public.alumni_profiles
      const { data: updated, error: updateErr } = await supabaseServer
        .from(SUPABASE_TABLES.ALUMNI_PROFILES)
        .update({
          phone: normalizedPhone,
          phone_ownership_verified: true,
          phone_verified_at: now,
          phone_verification_notes: params.notes || 'Verified by portal administrator',
          updated_at: now,
        })
        .eq('id', profileId)
        .select()
        .single();

      if (updateErr || !updated) {
        throw new Error('Phone verification could not be saved.');
      }

      // 4. Synchronize phone into Supabase Auth auth.users via Admin API
      if (profile.auth_user_id) {
        try {
          await supabaseServer.auth.admin.updateUserById(profile.auth_user_id, {
            phone: normalizedPhone,
            phone_confirm: true,
          });
        } catch (authErr: any) {
          console.warn('Note: GoTrue phone provider update notice:', authErr?.message || authErr);
        }
      }

      await recordSecurityAuditLog({
        actorUid: params.actorUid,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        action: 'VERIFY_PHONE_OWNERSHIP',
        targetType: 'alumni_profile',
        targetId: String(profileId),
        severity: 'info',
        summary: `Admin verified phone ownership for ${profile.full_name} (${normalizedPhone}). Phone login enabled.`,
      });

      return {
        id: profileId,
        fullName: profile.full_name,
        phone: normalizedPhone,
        phoneOwnershipVerified: true,
        phoneVerifiedAt: now,
        phoneVerificationNotes: params.notes || 'Verified by portal administrator',
      };
    } catch (err: any) {
      console.error('adminVerifyAlumniPhoneOwnership error:', err);
      throw err;
    }
  }

  throw new Error('Supabase is required to verify phone ownership.');
}

export async function adminRevokeAlumniPhoneOwnership(params: {
  profileId: number;
  notes?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  const profileId = Number(params.profileId);
  const now = new Date().toISOString();

  if (isSupabaseServerConfigured && profileId) {
    try {
      const { data: profile } = await supabaseServer
        .from(SUPABASE_TABLES.ALUMNI_PROFILES)
        .select('*')
        .eq('id', profileId)
        .single();

      if (profile) {
        await supabaseServer
          .from(SUPABASE_TABLES.ALUMNI_PROFILES)
          .update({
            phone_ownership_verified: false,
            phone_verified_at: null,
            phone_verification_notes: params.notes || 'Phone verification revoked by administrator',
            updated_at: now,
          })
          .eq('id', profileId);

        await recordSecurityAuditLog({
          actorUid: params.actorUid,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: 'REVOKE_PHONE_OWNERSHIP',
          targetType: 'alumni_profile',
          targetId: String(profileId),
          severity: 'warning',
          summary: `Admin revoked phone ownership verification for ${profile.full_name} (${profile.phone}). Phone login disabled.`,
        });
      }
      return { id: profileId, phoneOwnershipVerified: false };
    } catch (err: any) {
      console.error('adminRevokeAlumniPhoneOwnership error:', err);
      throw err;
    }
  }

  const found = inMemoryAlumniProfiles.find((p) => p.id === profileId);
  if (found) {
    found.phoneOwnershipVerified = false;
    found.phoneVerifiedAt = null;
  }
  return { id: profileId, phoneOwnershipVerified: false };
}

export async function getVerificationQueue(statusFilter?: string) {
  if (isSupabaseServerConfigured) {
    try {
      let query = supabaseServer
        .from(SUPABASE_TABLES.ADMIN_DOC_SUBMISSIONS)
        .select('*')
        .order('submitted_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          submissionCode: `DOC-${String(r.id).slice(0, 8)}`,
          profileId: r.user_id,
          fullName: 'Notredamian Alumnus',
          avatarUrl: '/ndc-logo.png',
          batchYear: r.batch_year,
          collegeRoll: r.college_roll,
          academicStream: r.academic_stream,
          academicGroup: r.academic_group,
          docType: r.doc_type,
          docTypeLabel: r.doc_type_label,
          documentUrl: r.storage_object_path,
          status: r.status,
          submittedAt: r.submitted_at,
          reviewedBy: r.reviewed_by ? String(r.reviewed_by) : null,
          reviewedAt: r.reviewed_at,
          adminNote: r.admin_note,
        }));
      }
    } catch (err) {
      console.warn('Supabase getVerificationQueue error:', err);
    }
  }
  return [];
}

export async function reviewVerificationSubmission(params: {
  submissionId: number | string;
  decision: 'approved' | 'rejected';
  adminNote?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  if (isSupabaseServerConfigured && params.submissionId) {
    try {
      const { data: submission, error: submissionError } = await supabaseServer
        .from(SUPABASE_TABLES.ADMIN_DOC_SUBMISSIONS)
        .select('id, user_id')
        .eq('id', params.submissionId)
        .maybeSingle();
      if (submissionError || !submission) throw new Error('Verification submission not found.');

      if (submission.user_id) {
        const { data: applicant, error: applicantError } = await supabaseServer
          .from(SUPABASE_TABLES.ALUMNI_PROFILES)
          .select('auth_user_id')
          .eq('id', submission.user_id)
          .maybeSingle();
        if (applicantError) throw applicantError;
        if (applicant?.auth_user_id === params.actorUid) {
          throw new Error('Administrators cannot review their own verification submission.');
        }
      }

      const { data, error } = await supabaseServer
        .from(SUPABASE_TABLES.ADMIN_DOC_SUBMISSIONS)
        .update({
          status: params.decision,
          admin_note: params.adminNote || 'Reviewed by central admin',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', params.submissionId)
        .select()
        .single();

      if (!error && data) {
        // Also update linked alumni profile verification status
        if (params.decision === 'approved' && data.user_id) {
          await supabaseServer
            .from(SUPABASE_TABLES.ALUMNI_PROFILES)
            .update({
              verification_status: 'verified',
              verification_method: 'id_card_upload',
              verified_at: new Date().toISOString(),
            })
            .eq('id', data.user_id);
        }

        await recordSecurityAuditLog({
          actorUid: params.actorUid,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: params.decision === 'approved' ? 'APPROVE_VERIFICATION_DOC' : 'REJECT_VERIFICATION_DOC',
          targetType: 'verification_submission',
          targetId: String(params.submissionId),
          severity: params.decision === 'approved' ? 'info' : 'warning',
          summary: `${params.decision.toUpperCase()} document verification for submission ID ${params.submissionId}.`,
        });

        return data;
      }
    } catch (err) {
      console.warn('Supabase reviewVerificationSubmission error:', err);
      throw err;
    }
  }

  throw new Error('Supabase is required to review verification submissions.');
}

export async function getBloodEmergencyList() {
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer
        .from(SUPABASE_TABLES.BLOOD_REQUESTS)
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          requestCode: `BLD-${String(r.id).slice(0, 8)}`,
          patientName: r.patient_relation || 'Notredamian Patient',
          bloodGroup: r.blood_group,
          unitsNeeded: r.units_required,
          unitsFulfilled: r.units_fulfilled || 0,
          hospitalName: r.hospital_name,
          hospitalArea: r.hospital_area,
          contactNumber: r.coordination_ref || 'Through Portal',
          urgencyLevel: r.emergency_level,
          status: r.status,
          verifiedByAdmin: r.verified_by_admin_id ? String(r.verified_by_admin_id) : null,
          moderationNote: r.moderation_note,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase getBloodEmergencyList error:', err);
    }
  }
  return [];
}

export async function moderateBloodEmergency(params: {
  id: number | string;
  status: string;
  unitsFulfilled?: number;
  moderationNote?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  if (isSupabaseServerConfigured && params.id) {
    try {
      const updates: Record<string, any> = {
        status: params.status,
        updated_at: new Date().toISOString(),
      };
      if (params.unitsFulfilled !== undefined) updates.units_fulfilled = params.unitsFulfilled;
      if (params.moderationNote !== undefined) updates.moderation_note = params.moderationNote;

      const { data, error } = await supabaseServer
        .from(SUPABASE_TABLES.BLOOD_REQUESTS)
        .update(updates)
        .eq('id', params.id)
        .select()
        .single();

      if (!error && data) {
        await recordSecurityAuditLog({
          actorUid: params.actorUid,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: 'MODERATE_BLOOD_REQUEST',
          targetType: 'blood_request',
          targetId: String(params.id),
          severity: 'info',
          summary: `Moderated blood request ${params.id} to "${params.status}".`,
        });
        return data;
      }
    } catch (err) {
      console.warn('Supabase moderateBloodEmergency error:', err);
    }
  }

  return {
    id: params.id,
    status: params.status,
    unitsFulfilled: params.unitsFulfilled,
    moderationNote: params.moderationNote,
  };
}

export async function getOfficialNoticesList() {
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer
        .from(SUPABASE_TABLES.OFFICIAL_NOTICES)
        .select('*')
        .order('is_urgent', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          refNo: r.ref_no || `NDCAA/NOT-${String(r.id).slice(0, 6)}`,
          title: r.title,
          category: r.category,
          content: r.full_content || r.summary,
          targetBatch: null,
          isPinned: r.is_urgent,
          isPublished: r.is_published,
          authorName: r.signatory_name || 'Alumni Secretariat',
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase getOfficialNoticesList error:', err);
    }
  }
  return [];
}

export async function createOrUpdateOfficialNotice(params: {
  id?: number | string;
  title: string;
  category: string;
  content: string;
  targetBatch?: number | null;
  isPinned?: boolean;
  isPublished?: boolean;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  if (isSupabaseServerConfigured) {
    try {
      if (params.id) {
        const { data, error } = await supabaseServer
          .from(SUPABASE_TABLES.OFFICIAL_NOTICES)
          .update({
            title: params.title.trim(),
            category: params.category,
            full_content: params.content.trim(),
            summary: params.content.trim().slice(0, 200),
            is_urgent: Boolean(params.isPinned),
            is_published: Boolean(params.isPublished ?? true),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id)
          .select()
          .single();
        if (!error && data) return data;
      } else {
        const { data, error } = await supabaseServer
          .from(SUPABASE_TABLES.OFFICIAL_NOTICES)
          .insert({
            ref_no: `NDCAA/NOT-2026/${Math.floor(Math.random() * 900) + 100}`,
            title: params.title.trim(),
            category: params.category as any,
            published_date: new Date().toISOString().split('T')[0],
            summary: params.content.trim().slice(0, 200),
            full_content: params.content.trim(),
            is_urgent: Boolean(params.isPinned),
            is_published: Boolean(params.isPublished ?? true),
            signatory_name: params.actorEmail,
            signatory_designation: 'Portal Administrator',
            signatory_organization: 'Notre Dame College Alumni Association',
          })
          .select()
          .single();
        if (!error && data) return data;
      }
    } catch (err) {
      console.warn('Supabase createOrUpdateOfficialNotice error:', err);
    }
  }

  return {
    id: params.id || Date.now(),
    refNo: `NDCAA/NOT-2026/099`,
    title: params.title.trim(),
    category: params.category,
    content: params.content.trim(),
    isPinned: Boolean(params.isPinned),
    isPublished: Boolean(params.isPublished ?? true),
    authorName: params.actorEmail,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function generateBulkBatchCohortSample(params: {
  countToGenerate: number;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  // Production safe: demo batch generation disabled in production
  await recordSecurityAuditLog({
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: 'BULK_COHORT_ATTEMPT',
    targetType: 'alumni_profile',
    targetId: 'PRODUCTION_NOOP',
    severity: 'info',
    summary: 'Bulk sample generation skipped in production mode (Supabase is single source of truth).',
  });
  return { insertedCount: 0 };
}
