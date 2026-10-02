import { db } from './index.ts';
import {
  academicStreamGroups,
  alumniProfiles,
  bloodEmergencyRequests,
  officialNotices,
  securityAuditLogs,
  users,
  verificationSubmissions,
} from './schema.ts';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';

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
  try {
    const inserted = await db
      .insert(securityAuditLogs)
      .values({
        actorUid: params.actorUid,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        severity: params.severity || 'info',
        summary: params.summary,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Audit log insert failed:', error);
    throw new Error('Failed to write security audit log.', { cause: error });
  }
}

export async function validateAcademicStreamAndGroup(
  stream: string,
  groupCode?: string | null
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const cleanStream = (stream || 'Science').trim();
    const cleanGroup = groupCode ? groupCode.trim().toUpperCase() : null;

    const streamRows = await db
      .select()
      .from(academicStreamGroups)
      .where(and(eq(academicStreamGroups.stream, cleanStream), eq(academicStreamGroups.isActive, true)));

    if (streamRows.length === 0) {
      return {
        valid: false,
        reason: `Academic stream "${cleanStream}" is not active in the institutional registry.`,
      };
    }

    if (!cleanGroup) {
      // Null group is permitted for Science and historical batches
      return { valid: true };
    }

    const matchingGroup = streamRows.find(
      (r) => r.groupCode && r.groupCode.toUpperCase() === cleanGroup && r.isActive
    );
    if (!matchingGroup) {
      const allowedCodes = streamRows
        .map((r) => r.groupCode)
        .filter((c): c is string => Boolean(c));
      if (allowedCodes.length === 0) {
        return {
          valid: false,
          reason: `${cleanStream} official group codes are not yet unlocked; leave group blank or select stream only.`,
        };
      }
      return {
        valid: false,
        reason: `Invalid group "${cleanGroup}" for stream "${cleanStream}". Allowed groups: ${allowedCodes.join(', ')}.`,
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Stream/group validation query failed:', error);
    throw new Error('Failed to validate academic stream and group.', { cause: error });
  }
}

export async function getAdminOverviewMetrics() {
  try {
    const [
      totalProfilesRes,
      verifiedProfilesRes,
      pendingProfilesRes,
      suspendedProfilesRes,
      donorsRes,
      pendingDocsRes,
      activeBloodRes,
      publishedNoticesRes,
      streamGroupsRows,
      recentAuditRows,
    ] = await Promise.all([
      db.select({ value: count() }).from(alumniProfiles),
      db
        .select({ value: count() })
        .from(alumniProfiles)
        .where(eq(alumniProfiles.verificationStatus, 'verified')),
      db
        .select({ value: count() })
        .from(alumniProfiles)
        .where(eq(alumniProfiles.verificationStatus, 'pending_vouch')),
      db
        .select({ value: count() })
        .from(alumniProfiles)
        .where(eq(alumniProfiles.accountStatus, 'suspended')),
      db
        .select({ value: count() })
        .from(alumniProfiles)
        .where(eq(alumniProfiles.isRegisteredDonor, true)),
      db
        .select({ value: count() })
        .from(verificationSubmissions)
        .where(eq(verificationSubmissions.status, 'pending')),
      db
        .select({ value: count() })
        .from(bloodEmergencyRequests)
        .where(
          or(
            eq(bloodEmergencyRequests.status, 'Active'),
            eq(bloodEmergencyRequests.status, 'Pending Verification')
          )
        ),
      db
        .select({ value: count() })
        .from(officialNotices)
        .where(eq(officialNotices.isPublished, true)),
      db.select().from(academicStreamGroups).orderBy(asc(academicStreamGroups.id)),
      db
        .select()
        .from(securityAuditLogs)
        .orderBy(desc(securityAuditLogs.createdAt))
        .limit(15),
    ]);

    const [scienceCountRes, humanitiesCountRes, businessCountRes] = await Promise.all([
      db
        .select({ value: count() })
        .from(alumniProfiles)
        .where(eq(alumniProfiles.academicStream, 'Science')),
      db
        .select({ value: count() })
        .from(alumniProfiles)
        .where(eq(alumniProfiles.academicStream, 'Humanities')),
      db
        .select({ value: count() })
        .from(alumniProfiles)
        .where(eq(alumniProfiles.academicStream, 'Business Studies')),
    ]);

    return {
      totalProfiles: Number(totalProfilesRes[0]?.value ?? 0),
      verifiedProfiles: Number(verifiedProfilesRes[0]?.value ?? 0),
      pendingProfiles: Number(pendingProfilesRes[0]?.value ?? 0),
      suspendedProfiles: Number(suspendedProfilesRes[0]?.value ?? 0),
      registeredDonors: Number(donorsRes[0]?.value ?? 0),
      pendingDocReviews: Number(pendingDocsRes[0]?.value ?? 0),
      activeBloodEmergencies: Number(activeBloodRes[0]?.value ?? 0),
      publishedNotices: Number(publishedNoticesRes[0]?.value ?? 0),
      streamDistribution: {
        Science: Number(scienceCountRes[0]?.value ?? 0),
        Humanities: Number(humanitiesCountRes[0]?.value ?? 0),
        'Business Studies': Number(businessCountRes[0]?.value ?? 0),
      },
      streamGroupsConfig: streamGroupsRows,
      recentAuditLogs: recentAuditRows,
    };
  } catch (error) {
    console.error('Failed to query admin overview metrics:', error);
    throw new Error('Failed to load overview metrics. Please try again later.', {
      cause: error,
    });
  }
}

export async function queryPaginatedAlumniProfiles(params: ProfileFilterParams) {
  try {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (params.batchYear && !Number.isNaN(Number(params.batchYear))) {
      conditions.push(eq(alumniProfiles.batchYear, Number(params.batchYear)));
    }
    if (params.academicStream && params.academicStream !== 'all') {
      conditions.push(eq(alumniProfiles.academicStream, params.academicStream));
    }
    if (params.verificationStatus && params.verificationStatus !== 'all') {
      conditions.push(eq(alumniProfiles.verificationStatus, params.verificationStatus));
    }
    if (params.role && params.role !== 'all') {
      conditions.push(eq(alumniProfiles.role, params.role));
    }
    if (params.accountStatus && params.accountStatus !== 'all') {
      conditions.push(eq(alumniProfiles.accountStatus, params.accountStatus));
    }
    if (params.bloodGroup && params.bloodGroup !== 'all') {
      conditions.push(eq(alumniProfiles.bloodGroup, params.bloodGroup));
    }
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(alumniProfiles.fullName, q),
          ilike(alumniProfiles.profession, q),
          ilike(alumniProfiles.institution, q),
          ilike(alumniProfiles.city, q),
          ilike(alumniProfiles.collegeRoll, q),
          ilike(alumniProfiles.email, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRes] = await Promise.all([
      whereClause
        ? db
            .select()
            .from(alumniProfiles)
            .where(whereClause)
            .orderBy(desc(alumniProfiles.createdAt), desc(alumniProfiles.id))
            .limit(limit)
            .offset(offset)
        : db
            .select()
            .from(alumniProfiles)
            .orderBy(desc(alumniProfiles.createdAt), desc(alumniProfiles.id))
            .limit(limit)
            .offset(offset),
      whereClause
        ? db.select({ value: count() }).from(alumniProfiles).where(whereClause)
        : db.select({ value: count() }).from(alumniProfiles),
    ]);

    const total = Number(totalRes[0]?.value ?? 0);

    // Redact PII if caller is not authorized for sensitive fields
    const sanitizedRows = rows.map((row) => {
      if (params.includeSensitivePii) {
        return row;
      }
      return {
        ...row,
        phone: row.phone ? '***-REDACTED-PII' : null,
        whatsapp: row.whatsapp ? '***-REDACTED-PII' : null,
        email: row.email ? '***@redacted.ndc' : null,
        fbLink: null,
        collegeRoll: row.collegeRoll ? `${row.collegeRoll.slice(0, 3)}***` : null,
      };
    });

    return {
      profiles: sanitizedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  } catch (error) {
    console.error('Paginated alumni query failed:', error);
    throw new Error('Failed to query alumni profiles.', { cause: error });
  }
}

export async function createOrRegisterAlumniProfile(input: {
  userUid?: string;
  fullName: string;
  avatarUrl?: string;
  batchYear: number;
  session?: string;
  collegeRoll?: string;
  academicStream: string;
  academicGroup?: string | null;
  section?: string;
  profession?: string;
  position?: string;
  institution?: string;
  specialty?: string[];
  degree?: string[];
  city?: string;
  country?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  passwordHash?: string;
  bloodGroup?: string;
  isRegisteredDonor?: boolean;
}) {
  try {
    const cleanEmail = (input.email || '').trim().toLowerCase();
    const cleanPhone = (input.phone || '').trim();
    if (cleanEmail || cleanPhone) {
      const existing = await findAlumniByCredential(cleanEmail || cleanPhone);
      if (existing) {
        throw new Error('An account with this mobile number or email is already registered. Please sign in instead.');
      }
    }

    const validation = await validateAcademicStreamAndGroup(
      input.academicStream,
      input.academicGroup
    );
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid academic stream/group combination.');
    }

    const batchNum =
      input.batchYear > 1900 ? input.batchYear - 1950 : Number(input.batchYear) || 68;
    const hscYear = 1950 + batchNum;
    const session = input.session || `${hscYear - 2}-${String(hscYear).slice(-2)}`;

    const inserted = await db
      .insert(alumniProfiles)
      .values({
        userUid: input.userUid || null,
        fullName: input.fullName.trim(),
        avatarUrl:
          input.avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        batchYear: batchNum,
        session,
        collegeRoll: input.collegeRoll?.trim() || null,
        academicStream: input.academicStream,
        academicGroup: input.academicGroup ? input.academicGroup.trim().toUpperCase() : null,
        section: input.section || null,
        verificationStatus: 'pending_vouch',
        verificationMethod: 'two_vouches',
        vouchesCount: 0,
        vouchTargetCount: 2,
        profession: input.profession || '',
        position: input.position || '',
        institution: input.institution || '',
        specialty: input.specialty || [],
        degree: input.degree || ['HSC'],
        city: input.city || 'Dhaka',
        country: input.country || 'Bangladesh',
        phone: input.phone || null,
        whatsapp: input.whatsapp || null,
        email: input.email || null,
        passwordHash: input.passwordHash || null,
        bloodGroup: input.bloodGroup || null,
        isRegisteredDonor: Boolean(input.isRegisteredDonor),
        role: 'member',
        accountStatus: 'active',
        isPublic: true,
      })
      .returning();

    return inserted[0];
  } catch (error: any) {
    console.error('Create alumni profile failed:', error);
    throw new Error(error?.message || 'Failed to register alumni profile.', {
      cause: error,
    });
  }
}

export async function findAlumniByCredential(identifier: string) {
  if (!identifier?.trim()) return null;
  const clean = identifier.trim().toLowerCase();
  const digits = clean.replace(/[^0-9]/g, '');

  if (clean.includes('@')) {
    const rows = await db
      .select()
      .from(alumniProfiles)
      .where(ilike(alumniProfiles.email, clean))
      .limit(1);
    if (rows.length > 0) return rows[0];
  }

  // Check phone match
  if (digits.length >= 6) {
    const lastDigits = digits.length >= 10 ? digits.slice(-10) : digits;
    const rows = await db
      .select()
      .from(alumniProfiles)
      .where(
        or(
          ilike(alumniProfiles.phone, `%${lastDigits}`),
          eq(alumniProfiles.phone, identifier.trim())
        )
      )
      .limit(1);
    if (rows.length > 0) return rows[0];
  }

  // Fallback match email or fullName
  const rows = await db
    .select()
    .from(alumniProfiles)
    .where(
      or(
        ilike(alumniProfiles.email, clean),
        ilike(alumniProfiles.fullName, clean)
      )
    )
    .limit(1);

  return rows[0] || null;
}

export async function updateAlumniPassword(profileId: number, passwordHash: string) {
  const updated = await db
    .update(alumniProfiles)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(alumniProfiles.id, profileId))
    .returning();
  return updated[0] || null;
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
  try {
    if (params.academicStream) {
      const check = await validateAcademicStreamAndGroup(
        params.academicStream,
        params.academicGroup
      );
      if (!check.valid) {
        throw new Error(check.reason || 'Invalid stream/group combination.');
      }
    }

    const existingRows = await db
      .select()
      .from(alumniProfiles)
      .where(eq(alumniProfiles.id, params.profileId))
      .limit(1);

    if (existingRows.length === 0) {
      throw new Error('Alumni profile not found.');
    }

    const current = existingRows[0];
    const nextVerification = params.verificationStatus || current.verificationStatus;
    const nextRole = params.role || current.role;
    const nextAccountStatus = params.accountStatus || current.accountStatus;

    const updated = await db
      .update(alumniProfiles)
      .set({
        verificationStatus: nextVerification,
        verificationMethod:
          nextVerification === 'verified' ? 'admin_verified' : current.verificationMethod,
        verifiedByAdmin:
          nextVerification === 'verified' ? params.actorEmail : current.verifiedByAdmin,
        verificationDate:
          nextVerification === 'verified'
            ? new Date().toISOString().split('T')[0]
            : current.verificationDate,
        role: nextRole,
        accountStatus: nextAccountStatus,
        academicStream: params.academicStream || current.academicStream,
        academicGroup:
          params.academicGroup !== undefined ? params.academicGroup : current.academicGroup,
        adminReviewNote:
          params.adminReviewNote !== undefined
            ? params.adminReviewNote
            : current.adminReviewNote,
        updatedAt: new Date(),
      })
      .where(eq(alumniProfiles.id, params.profileId))
      .returning();

    // If profile has a linked userUid, keep users.role in sync
    if (current.userUid && params.role) {
      await db
        .update(users)
        .set({
          role: nextRole,
          accountStatus: nextAccountStatus,
        })
        .where(eq(users.uid, current.userUid));
    }

    await recordSecurityAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: 'UPDATE_PROFILE_GOVERNANCE',
      targetType: 'alumni_profile',
      targetId: String(params.profileId),
      severity: nextAccountStatus === 'suspended' || nextRole === 'admin' ? 'warning' : 'info',
      summary: `Updated ${current.fullName} (Batch ${current.batchYear}): status=${nextVerification}, role=${nextRole}, account=${nextAccountStatus}.`,
    });

    return updated[0];
  } catch (error: any) {
    console.error('Admin update profile governance failed:', error);
    throw new Error(error?.message || 'Failed to update profile governance.', {
      cause: error,
    });
  }
}

export async function getVerificationQueue(statusFilter?: string) {
  try {
    if (statusFilter && statusFilter !== 'all') {
      return await db
        .select()
        .from(verificationSubmissions)
        .where(eq(verificationSubmissions.status, statusFilter))
        .orderBy(desc(verificationSubmissions.submittedAt));
    }
    return await db
      .select()
      .from(verificationSubmissions)
      .orderBy(desc(verificationSubmissions.submittedAt));
  } catch (error) {
    console.error('Verification queue fetch failed:', error);
    throw new Error('Failed to load verification submissions.', { cause: error });
  }
}

export async function reviewVerificationSubmission(params: {
  submissionId: number;
  decision: 'approved' | 'rejected';
  adminNote?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  try {
    const rows = await db
      .select()
      .from(verificationSubmissions)
      .where(eq(verificationSubmissions.id, params.submissionId))
      .limit(1);

    if (rows.length === 0) {
      throw new Error('Verification submission not found.');
    }

    const sub = rows[0];

    const updatedSub = await db
      .update(verificationSubmissions)
      .set({
        status: params.decision,
        reviewedBy: params.actorEmail,
        reviewedAt: new Date(),
        adminNote:
          params.adminNote ||
          (params.decision === 'approved'
            ? 'Verified against official NDC batch & college roll records.'
            : 'Document unreadable or roll mismatch.'),
      })
      .where(eq(verificationSubmissions.id, params.submissionId))
      .returning();

    // Update linked alumni profile verification status automatically
    await db
      .update(alumniProfiles)
      .set({
        verificationStatus: params.decision === 'approved' ? 'verified' : 'unverified',
        verificationMethod: 'id_card_upload',
        verifiedByAdmin: params.decision === 'approved' ? params.actorEmail : null,
        verificationDate:
          params.decision === 'approved' ? new Date().toISOString().split('T')[0] : null,
        adminReviewNote: params.adminNote || null,
        updatedAt: new Date(),
      })
      .where(eq(alumniProfiles.id, sub.profileId));

    await recordSecurityAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: params.decision === 'approved' ? 'APPROVE_VERIFICATION_DOC' : 'REJECT_VERIFICATION_DOC',
      targetType: 'verification_submission',
      targetId: sub.submissionCode,
      severity: params.decision === 'approved' ? 'info' : 'warning',
      summary: `${params.decision.toUpperCase()} document ${sub.submissionCode} for ${sub.fullName} (Batch ${sub.batchYear}, Roll ${sub.collegeRoll}).`,
    });

    return updatedSub[0];
  } catch (error: any) {
    console.error('Review verification submission failed:', error);
    throw new Error(error?.message || 'Failed to process verification decision.', {
      cause: error,
    });
  }
}

export async function getBloodEmergencyList() {
  try {
    return await db
      .select()
      .from(bloodEmergencyRequests)
      .orderBy(desc(bloodEmergencyRequests.createdAt));
  } catch (error) {
    console.error('Failed to query blood emergency requests:', error);
    throw new Error('Failed to load blood emergency requests.', { cause: error });
  }
}

export async function moderateBloodEmergency(params: {
  id: number;
  status: string;
  unitsFulfilled?: number;
  moderationNote?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  try {
    const existing = await db
      .select()
      .from(bloodEmergencyRequests)
      .where(eq(bloodEmergencyRequests.id, params.id))
      .limit(1);

    if (existing.length === 0) {
      throw new Error('Blood emergency request not found.');
    }

    const reqItem = existing[0];
    const updated = await db
      .update(bloodEmergencyRequests)
      .set({
        status: params.status,
        unitsFulfilled:
          params.unitsFulfilled !== undefined ? params.unitsFulfilled : reqItem.unitsFulfilled,
        verifiedByAdmin: params.actorEmail,
        moderationNote:
          params.moderationNote !== undefined ? params.moderationNote : reqItem.moderationNote,
        updatedAt: new Date(),
      })
      .where(eq(bloodEmergencyRequests.id, params.id))
      .returning();

    await recordSecurityAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: 'MODERATE_BLOOD_REQUEST',
      targetType: 'blood_request',
      targetId: reqItem.requestCode,
      severity: 'info',
      summary: `Updated blood request ${reqItem.requestCode} (${reqItem.bloodGroup} at ${reqItem.hospitalName}) to status="${params.status}".`,
    });

    return updated[0];
  } catch (error) {
    console.error('Moderate blood emergency failed:', error);
    throw new Error('Failed to moderate blood emergency request.', { cause: error });
  }
}

export async function getOfficialNoticesList() {
  try {
    return await db
      .select()
      .from(officialNotices)
      .orderBy(desc(officialNotices.isPinned), desc(officialNotices.createdAt));
  } catch (error) {
    console.error('Failed to load official notices:', error);
    throw new Error('Failed to load official notices.', { cause: error });
  }
}

export async function createOrUpdateOfficialNotice(params: {
  id?: number;
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
  try {
    if (params.id) {
      const updated = await db
        .update(officialNotices)
        .set({
          title: params.title.trim(),
          category: params.category,
          content: params.content.trim(),
          targetBatch: params.targetBatch ?? null,
          isPinned: Boolean(params.isPinned),
          isPublished: Boolean(params.isPublished),
          updatedAt: new Date(),
        })
        .where(eq(officialNotices.id, params.id))
        .returning();

      await recordSecurityAuditLog({
        actorUid: params.actorUid,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        action: 'UPDATE_OFFICIAL_NOTICE',
        targetType: 'notice',
        targetId: String(params.id),
        severity: 'info',
        summary: `Updated notice "${params.title}" (published=${Boolean(params.isPublished)}).`,
      });
      return updated[0];
    }

    const inserted = await db
      .insert(officialNotices)
      .values({
        title: params.title.trim(),
        category: params.category || 'General',
        content: params.content.trim(),
        targetBatch: params.targetBatch ?? null,
        isPinned: Boolean(params.isPinned),
        isPublished: Boolean(params.isPublished),
        authorName: params.actorEmail,
      })
      .returning();

    await recordSecurityAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: 'CREATE_OFFICIAL_NOTICE',
      targetType: 'notice',
      targetId: String(inserted[0].id),
      severity: 'info',
      summary: `Created official notice "${params.title}" (published=${Boolean(params.isPublished)}).`,
    });

    return inserted[0];
  } catch (error) {
    console.error('Create/update official notice failed:', error);
    throw new Error('Failed to save official notice.', { cause: error });
  }
}

export async function getAcademicStreamGroupsConfig() {
  try {
    return await db
      .select()
      .from(academicStreamGroups)
      .orderBy(asc(academicStreamGroups.stream), asc(academicStreamGroups.groupCode));
  } catch (error) {
    console.error('Failed to query academic stream groups:', error);
    throw new Error('Failed to load academic stream group configuration.', { cause: error });
  }
}

export async function toggleAcademicStreamGroupActive(params: {
  id: number;
  isActive: boolean;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  try {
    const updated = await db
      .update(academicStreamGroups)
      .set({
        isActive: params.isActive,
        updatedAt: new Date(),
      })
      .where(eq(academicStreamGroups.id, params.id))
      .returning();

    if (updated.length === 0) {
      throw new Error('Academic stream group row not found.');
    }

    const row = updated[0];
    await recordSecurityAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: 'TOGGLE_STREAM_GROUP_STATUS',
      targetType: 'stream_config',
      targetId: `${row.stream}:${row.groupCode || 'METADATA'}`,
      severity: 'warning',
      summary: `Set ${row.stream} (Group ${row.groupCode || 'Capacity 17'}) active=${row.isActive}.`,
    });

    return row;
  } catch (error) {
    console.error('Toggle stream group active failed:', error);
    throw new Error('Failed to update stream group status.', { cause: error });
  }
}

export async function generateBulkBatchCohortSample(params: {
  countToGenerate: number;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  try {
    const safeCount = Math.min(250, Math.max(10, params.countToGenerate || 50));
    const streams: Array<{ stream: string; groups: Array<string | null> }> = [
      { stream: 'Science', groups: [null] },
      { stream: 'Humanities', groups: ['G', 'H', 'L', 'W'] },
      { stream: 'Business Studies', groups: ['A', 'B', 'C', 'D', 'E', 'F'] },
    ];
    const firstNames = [
      'Tanvir', 'Farhan', 'Mahmudul', 'Ashfaqur', 'Raihan', 'Samiul', 'Adnan', 'Nafis',
      'Tariqul', 'Zahirul', 'Kamrul', 'Shafiqul', 'Muntasir', 'Hasibul', 'Tawsif', 'Rashedul',
    ];
    const lastNames = [
      'Rahman', 'Chowdhury', 'Hasan', 'Kabir', 'Alim', 'Islam', 'Ahmed', 'Karim',
      'Hossain', 'Siddiqui', 'bhuiyan', 'Majumder', 'Talukder', 'Khandaker',
    ];
    const professions = [
      { prof: 'Software & Technology', pos: 'Senior Software Architect', inst: 'Brain Station 23' },
      { prof: 'Medicine & Healthcare', pos: 'Consultant Physician', inst: 'BSMMU' },
      { prof: 'Finance & Banking', pos: 'Vice President', inst: 'BRAC Bank PLC' },
      { prof: 'Engineering & Research', pos: 'Associate Professor', inst: 'BUET' },
      { prof: 'Civil Service (BCS)', pos: 'Deputy Secretary', inst: 'Government of Bangladesh' },
      { prof: 'Law & Judiciary', pos: 'Advocate', inst: 'Supreme Court of Bangladesh' },
    ];
    const cities = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'London', 'Toronto', 'New York', 'Singapore'];
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const avatars = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    ];

    const recordsToInsert = [];
    const baseTs = Date.now() % 100000;

    for (let i = 0; i < safeCount; i++) {
      const batchYear = 45 + ((i * 7) % 33); // Batches 45..77
      const hscYear = 1950 + batchYear;
      const session = `${hscYear - 2}-${String(hscYear).slice(-2)}`;
      const streamPick = streams[i % streams.length];
      const groupPick = streamPick.groups[i % streamPick.groups.length];
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[(i * 3) % lastNames.length];
      const career = professions[i % professions.length];
      const isVerified = i % 4 !== 0;

      recordsToInsert.push({
        fullName: `${fn} ${ln}`,
        avatarUrl: avatars[i % avatars.length],
        batchYear,
        session,
        collegeRoll: `${streamPick.stream === 'Science' ? '1' : streamPick.stream === 'Business Studies' ? '2' : '3'}${String(batchYear).padStart(2, '0')}${String((baseTs + i) % 900 + 100)}`,
        academicStream: streamPick.stream,
        academicGroup: groupPick,
        section: groupPick ? `Group ${groupPick}` : 'Science Cohort',
        verificationStatus: isVerified ? 'verified' : 'pending_vouch',
        verificationMethod: isVerified ? 'two_vouches' : 'id_card_upload',
        vouchesCount: isVerified ? 2 : 1,
        vouchTargetCount: 2,
        verifiedByAdmin: isVerified ? params.actorEmail : null,
        verificationDate: isVerified ? new Date().toISOString().split('T')[0] : null,
        profession: career.prof,
        position: career.pos,
        institution: career.inst,
        specialty: [career.prof],
        degree: ['HSC', 'BSc', 'MSc'],
        city: cities[i % cities.length],
        country: i % 6 >= 4 ? 'International' : 'Bangladesh',
        phone: `+88017${String(10000000 + ((baseTs + i) % 89999999))}`,
        whatsapp: `+88017${String(10000000 + ((baseTs + i) % 89999999))}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}.b${batchYear}.${i}@ndcalumni.org`,
        bloodGroup: bloodGroups[i % bloodGroups.length],
        isRegisteredDonor: i % 2 === 0,
        donorAvailability: 'available',
        preferredArea: cities[i % cities.length],
        role: 'member',
        accountStatus: 'active',
        isPublic: true,
        badges: isVerified ? ['Verified Alumnus'] : [],
      });
    }

    await db.insert(alumniProfiles).values(recordsToInsert);

    await recordSecurityAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: 'BULK_COHORT_IMPORT',
      targetType: 'alumni_profile',
      targetId: `BATCH_IMPORT_${safeCount}`,
      severity: 'info',
      summary: `Executed high-speed batch cohort import of ${safeCount} indexed alumni records with stream/group validation.`,
    });

    return { insertedCount: safeCount };
  } catch (error) {
    console.error('Bulk cohort generation failed:', error);
    throw new Error('Failed to execute bulk cohort import.', { cause: error });
  }
}
