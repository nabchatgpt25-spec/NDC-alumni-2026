import { supabase, isSupabaseConfigured, ALUMNI_PUBLIC_COLUMNS } from '../lib/supabase';
import { AdminDocSubmission, AlumniProfile, UserRole, VerificationDocType } from '../types';

export interface AdminOverviewStats {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  pendingDocReviews: number;
  approvedDocReviews: number;
  rejectedDocReviews: number;
  totalPosts: number;
  adminCount: number;
  modCount: number;
}

export interface AlumniAdminListItem {
  id: number;
  userId: number;
  fullName: string;
  avatarUrl: string;
  batchYear: number;
  collegeRoll?: string;
  academicStream?: string;
  academicGroup?: string;
  role: UserRole;
  verificationStatus: string;
  profession?: string;
  institution?: string;
  city?: string;
  country?: string;
  createdAt?: string;
}

export interface ModerationPostItem {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatar: string;
  authorBatch: number;
  content: string;
  category: string;
  images: string[];
  videos: string[];
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  createdAt: string;
}

export interface SystemAuditLogItem {
  id: number;
  actorProfileId?: number | null;
  actorAuthId?: string | null;
  actorRole?: string | null;
  actorName?: string;
  action: string;
  entityTable: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  reason?: string | null;
  createdAt: string;
}

/**
 * Fetch real aggregate statistics from Supabase for the Admin Overview tab.
 */
export async function fetchAdminOverviewStats(): Promise<AdminOverviewStats> {
  if (!isSupabaseConfigured) {
    return {
      totalUsers: 0,
      verifiedUsers: 0,
      unverifiedUsers: 0,
      pendingDocReviews: 0,
      approvedDocReviews: 0,
      rejectedDocReviews: 0,
      totalPosts: 0,
      adminCount: 0,
      modCount: 0,
    };
  }

  try {
    const [
      totalUsersRes,
      verifiedUsersRes,
      unverifiedUsersRes,
      pendingDocsRes,
      approvedDocsRes,
      rejectedDocsRes,
      totalPostsRes,
      adminCountRes,
      modCountRes,
    ] = await Promise.all([
      supabase.from('alumni_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('alumni_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
      supabase.from('alumni_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'unverified'),
      supabase.from('admin_doc_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('admin_doc_submissions').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('admin_doc_submissions').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('alumni_profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('alumni_profiles').select('id', { count: 'exact', head: true }).eq('role', 'moderator'),
    ]);

    return {
      totalUsers: totalUsersRes.count ?? 0,
      verifiedUsers: verifiedUsersRes.count ?? 0,
      unverifiedUsers: unverifiedUsersRes.count ?? 0,
      pendingDocReviews: pendingDocsRes.count ?? 0,
      approvedDocReviews: approvedDocsRes.count ?? 0,
      rejectedDocReviews: rejectedDocsRes.count ?? 0,
      totalPosts: totalPostsRes.count ?? 0,
      adminCount: adminCountRes.count ?? 0,
      modCount: modCountRes.count ?? 0,
    };
  } catch (err) {
    console.warn('fetchAdminOverviewStats error:', err);
    return {
      totalUsers: 0,
      verifiedUsers: 0,
      unverifiedUsers: 0,
      pendingDocReviews: 0,
      approvedDocReviews: 0,
      rejectedDocReviews: 0,
      totalPosts: 0,
      adminCount: 0,
      modCount: 0,
    };
  }
}

/**
 * Fetch rows from admin_doc_submissions, enriched with applicant profile details
 * and secure signed URLs for private verification document previews.
 */
export async function fetchAdminDocSubmissions(
  statusFilter: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'
): Promise<AdminDocSubmission[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    let query = supabase
      .from('admin_doc_submissions')
      .select(`
        id,
        user_id,
        batch_year,
        college_roll,
        academic_stream,
        academic_group,
        doc_type,
        doc_type_label,
        storage_object_path,
        status,
        reviewed_by,
        reviewed_at,
        admin_note,
        submitted_at,
        updated_at
      `)
      .order('submitted_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: submissions, error: subError } = await query;
    if (subError || !submissions || submissions.length === 0) {
      if (subError) console.warn('fetchAdminDocSubmissions error:', subError.message);
      return [];
    }

    // Collect applicant user IDs to batch-fetch names & avatars safely
    const userIds = Array.from(new Set(submissions.map((s: any) => Number(s.user_id)).filter(Boolean)));
    const profilesMap = new Map<number, { fullName: string; avatarUrl: string; verificationStatus?: string }>();

    if (userIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('alumni_profiles')
          .select('id, full_name, avatar_url, verification_status')
          .in('id', userIds);

        if (profiles) {
          profiles.forEach((p: any) => {
            profilesMap.set(Number(p.id), {
              fullName: p.full_name || 'Notredamian Alumnus',
              avatarUrl: p.avatar_url || '/ndc-logo.png',
              verificationStatus: p.verification_status,
            });
          });
        }
      } catch (profErr) {
        console.warn('Failed to batch-fetch applicant profiles:', profErr);
      }
    }

    // Global Check: For pending queue, automatically remove any applicant whose profile
    // is already verified by ANY administrator to completely eliminate duplicate effort!
    let filteredSubmissions = submissions;
    if (statusFilter === 'pending') {
      filteredSubmissions = submissions.filter((row: any) => {
        const prof = profilesMap.get(Number(row.user_id));
        return prof?.verificationStatus !== 'verified';
      });

      // Background auto-reconciliation: mark orphan pending submissions as approved
      const alreadyVerifiedIds = submissions
        .filter((row: any) => profilesMap.get(Number(row.user_id))?.verificationStatus === 'verified')
        .map((row: any) => row.id);

      if (alreadyVerifiedIds.length > 0) {
        (async () => {
          try {
            await supabase
              .from('admin_doc_submissions')
              .update({
                status: 'approved',
                admin_note: 'Auto-resolved: Alumnus identity verified by administrator',
                updated_at: new Date().toISOString(),
              })
              .in('id', alreadyVerifiedIds);
          } catch {}
        })();
      }
    }

    // Resolve secure preview URLs (create signed URLs for private storage bucket)
    const result: AdminDocSubmission[] = await Promise.all(
      filteredSubmissions.map(async (row: any) => {
        const userId = Number(row.user_id);
        const profile = profilesMap.get(userId) || {
          fullName: 'Notredamian Alumnus',
          avatarUrl: '/ndc-logo.png',
        };

        let resolvedDocUrl = '';
        const path = row.storage_object_path || '';

        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
          resolvedDocUrl = path;
        } else if (path) {
          try {
            const { data: signedData, error: signErr } = await supabase.storage
              .from('verification-documents')
              .createSignedUrl(path, 3600); // 1-hour secure viewing token

            if (!signErr && signedData?.signedUrl) {
              resolvedDocUrl = signedData.signedUrl;
            } else {
              // Fallback to public URL format if signed URL endpoint is restricted
              const { data: pubData } = supabase.storage
                .from('verification-documents')
                .getPublicUrl(path);
              resolvedDocUrl = pubData?.publicUrl || '';
            }
          } catch (storageErr) {
            console.warn('Failed to create signed URL for document:', path, storageErr);
          }
        }

        const validDocType: VerificationDocType =
          ['id_card', 'nid_card', 'hsc_slip', 'souvenir'].includes(row.doc_type)
            ? (row.doc_type as VerificationDocType)
            : 'id_card';

        const groupLabel = row.academic_group
          ? `${row.academic_stream || 'Science'} ${row.academic_group}`
          : row.academic_stream || 'Science';

        return {
          id: String(row.id),
          userId,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          batchYear: Number(row.batch_year) || 0,
          collegeRoll: String(row.college_roll || '').trim(),
          group: groupLabel,
          docType: validDocType,
          docTypeLabel: row.doc_type_label || 'Notre Dame ID Card',
          documentUrl: resolvedDocUrl,
          submittedAt: row.submitted_at || new Date().toISOString(),
          status: row.status || 'pending',
          reviewedBy: row.reviewed_by ? String(row.reviewed_by) : undefined,
          reviewedAt: row.reviewed_at || undefined,
          adminNote: row.admin_note || undefined,
        };
      })
    );

    return result;
  } catch (err) {
    console.warn('fetchAdminDocSubmissions exception:', err);
    return [];
  }
}

/**
 * Review an ID document submission (Approve or Reject).
 *
 * NOTE: Migration 011 database trigger `trg_handle_admin_doc_submission_review`
 * is ALREADY in production. Updating the status column in `admin_doc_submissions`
 * automatically handles updating alumni_profiles and inserting notification.
 * DO NOT write duplicate profile update code in frontend!
 */
export async function reviewAdminDocSubmission(params: {
  submissionId: string;
  status: 'approved' | 'rejected';
  adminNote?: string;
  reviewerProfileId: number;
}): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  const { submissionId, status, adminNote, reviewerProfileId } = params;

  try {
    // Self-approval protection pre-check
    if (reviewerProfileId) {
      const { data: subRow } = await supabase
        .from('admin_doc_submissions')
        .select('user_id')
        .eq('id', submissionId)
        .maybeSingle();

      if (subRow && Number(subRow.user_id) === Number(reviewerProfileId)) {
        return {
          success: false,
          error: 'Self-approval protection: You cannot review or approve your own verification document. Another administrator must review your submission.',
        };
      }
    }

    const updatePayload: Record<string, any> = {
      status,
      reviewed_by: reviewerProfileId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (adminNote !== undefined) {
      updatePayload.admin_note = adminNote.trim() || null;
    } else if (status === 'rejected') {
      updatePayload.admin_note =
        'Document unclear or incomplete. Please upload a clear photo of your NDC ID or HSC slip.';
    }

    const { error: updateError } = await supabase
      .from('admin_doc_submissions')
      .update(updatePayload)
      .eq('id', submissionId);

    if (updateError) {
      console.warn('reviewAdminDocSubmission error:', updateError.message);
      return { success: false, error: updateError.message };
    }

    // Global Check: When approved, auto-resolve any other pending submissions
    // or verification requests for this alumnus to remove them from all admin queues
    if (status === 'approved') {
      try {
        const { data: subRow } = await supabase
          .from('admin_doc_submissions')
          .select('user_id')
          .eq('id', submissionId)
          .maybeSingle();

        if (subRow?.user_id) {
          await Promise.all([
            supabase
              .from('admin_doc_submissions')
              .update({
                status: 'approved',
                reviewed_by: reviewerProfileId,
                reviewed_at: new Date().toISOString(),
                admin_note: adminNote || 'Automatically approved: Alumnus identity verified',
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', subRow.user_id)
              .eq('status', 'pending'),

            supabase
              .from('verification_requests')
              .update({
                status: 'verified',
                reviewed_by: reviewerProfileId,
                reviewed_at: new Date().toISOString(),
                admin_note: adminNote || 'Automatically verified: Alumnus identity verified',
                updated_at: new Date().toISOString(),
              })
              .eq('requester_id', subRow.user_id)
              .eq('status', 'pending'),
          ]);
        }
      } catch (cascadeErr) {
        console.warn('Auto-resolve other pending items error:', cascadeErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('reviewAdminDocSubmission exception:', err);
    return { success: false, error: err?.message || 'Failed to update submission status.' };
  }
}

/**
 * Search alumni directory for the User Management tab.
 */
export async function searchAlumniForAdmin(params: {
  query?: string;
  roleFilter?: 'all' | 'admin' | 'moderator' | 'member';
  statusFilter?: 'all' | 'verified' | 'unverified';
  page?: number;
  limit?: number;
}): Promise<{ alumni: AlumniAdminListItem[]; totalCount: number }> {
  if (!isSupabaseConfigured) {
    return { alumni: [], totalCount: 0 };
  }

  const {
    query = '',
    roleFilter = 'all',
    statusFilter = 'all',
    page = 1,
    limit = 25,
  } = params;

  try {
    const fromIndex = (page - 1) * limit;
    const toIndex = fromIndex + limit - 1;

    let dbQuery = supabase
      .from('alumni_profiles')
      .select(ALUMNI_PUBLIC_COLUMNS, { count: 'exact' });

    if (roleFilter !== 'all') {
      dbQuery = dbQuery.eq('role', roleFilter);
    }

    if (statusFilter !== 'all') {
      dbQuery = dbQuery.eq('verification_status', statusFilter);
    }

    const trimmed = query.trim();
    if (trimmed) {
      const num = Number(trimmed);
      if (!isNaN(num) && num >= 1949 && num <= new Date().getFullYear() + 1) {
        // Query by Batch Year
        dbQuery = dbQuery.eq('batch_year', num);
      } else {
        // Query by Name
        dbQuery = dbQuery.ilike('full_name', `%${trimmed}%`);
      }
    }

    dbQuery = dbQuery
      .order('batch_year', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(fromIndex, toIndex);

    const { data, count, error } = await dbQuery;

    if (error || !data) {
      console.warn('searchAlumniForAdmin error:', error?.message);
      return { alumni: [], totalCount: 0 };
    }

    const items: AlumniAdminListItem[] = data.map((row: any) => ({
      id: Number(row.id),
      userId: Number(row.id),
      fullName: row.full_name || 'Notredamian Alumnus',
      avatarUrl: row.avatar_url || '/ndc-logo.png',
      batchYear: Number(row.batch_year) || 0,
      collegeRoll: row.college_roll ? String(row.college_roll).trim() : undefined,
      academicStream: row.academic_stream || 'Science',
      academicGroup: row.academic_group || undefined,
      role: (row.role === 'admin' || row.role === 'moderator' ? row.role : 'member') as UserRole,
      verificationStatus: row.verification_status || 'unverified',
      profession: row.profession || undefined,
      institution: row.institution || undefined,
      city: row.city || 'Dhaka',
      country: row.country || 'Bangladesh',
      createdAt: row.created_at || undefined,
    }));

    return {
      alumni: items,
      totalCount: count ?? items.length,
    };
  } catch (err) {
    console.warn('searchAlumniForAdmin exception:', err);
    return { alumni: [], totalCount: 0 };
  }
}

// =============================================================================
// PHASE-2 ENHANCEMENTS: ROLE ELEVATION, CONTENT MODERATION & SYSTEM AUDIT LOGS
// =============================================================================

/**
 * Update an alumnus role (member <-> moderator <-> admin).
 * Protected by database trigger `protect_privileged_profile_columns` (Migration 002)
 * which ensures only genuine administrators can execute role elevations.
 */
export async function updateUserRole(params: {
  targetUserId: number;
  newRole: UserRole;
}): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  const { targetUserId, newRole } = params;

  try {
    const { error } = await supabase
      .from('alumni_profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (error) {
      console.warn('updateUserRole error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('updateUserRole exception:', err);
    return { success: false, error: err?.message || 'Failed to update user role.' };
  }
}

/**
 * Fetch feed posts for Content Moderation tab.
 * Includes pinned, deleted, and standard posts with author names & avatars.
 */
export async function fetchFeedPostsForModeration(params: {
  query?: string;
  filter?: 'all' | 'pinned' | 'deleted' | 'active';
  limit?: number;
} = {}): Promise<ModerationPostItem[]> {
  if (!isSupabaseConfigured) return [];

  const { query = '', filter = 'all', limit = 50 } = params;

  try {
    let dbQuery = supabase
      .from('posts')
      .select(`
        id,
        author_id,
        content,
        category,
        images,
        videos,
        likes_count,
        comments_count,
        is_pinned,
        is_deleted,
        is_edited,
        created_at
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filter === 'pinned') {
      dbQuery = dbQuery.eq('is_pinned', true).eq('is_deleted', false);
    } else if (filter === 'deleted') {
      dbQuery = dbQuery.eq('is_deleted', true);
    } else if (filter === 'active') {
      dbQuery = dbQuery.eq('is_deleted', false);
    }

    const { data: rawPosts, error: postErr } = await dbQuery;

    if (postErr || !rawPosts) {
      console.warn('fetchFeedPostsForModeration error:', postErr?.message);
      return [];
    }

    // Batch-fetch author profiles
    const authorIds = Array.from(new Set(rawPosts.map((p: any) => Number(p.author_id)).filter(Boolean)));
    const authorMap = new Map<number, { fullName: string; avatarUrl: string; batchYear: number }>();

    if (authorIds.length > 0) {
      try {
        const { data: authors } = await supabase
          .from('alumni_profiles')
          .select('id, full_name, avatar_url, batch_year')
          .in('id', authorIds);

        if (authors) {
          authors.forEach((a: any) => {
            authorMap.set(Number(a.id), {
              fullName: a.full_name || 'Notredamian Alumnus',
              avatarUrl: a.avatar_url || '/ndc-logo.png',
              batchYear: Number(a.batch_year) || 0,
            });
          });
        }
      } catch (profErr) {
        console.warn('Failed to batch-fetch post authors:', profErr);
      }
    }

    const mapped: ModerationPostItem[] = rawPosts.map((p: any) => {
      const author = authorMap.get(Number(p.author_id)) || {
        fullName: 'Notredamian Alumnus',
        avatarUrl: '/ndc-logo.png',
        batchYear: 0,
      };

      return {
        id: Number(p.id),
        authorId: Number(p.author_id),
        authorName: author.fullName,
        authorAvatar: author.avatarUrl,
        authorBatch: author.batchYear,
        content: p.content || '',
        category: p.category || 'General Update',
        images: Array.isArray(p.images) ? p.images : [],
        videos: Array.isArray(p.videos) ? p.videos : [],
        likesCount: Number(p.likes_count) || 0,
        commentsCount: Number(p.comments_count) || 0,
        isPinned: Boolean(p.is_pinned),
        isDeleted: Boolean(p.is_deleted),
        isEdited: Boolean(p.is_edited),
        createdAt: p.created_at || new Date().toISOString(),
      };
    });

    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      return mapped.filter(
        (post) =>
          post.content.toLowerCase().includes(trimmed) ||
          post.authorName.toLowerCase().includes(trimmed) ||
          post.category.toLowerCase().includes(trimmed)
      );
    }

    return mapped;
  } catch (err) {
    console.warn('fetchFeedPostsForModeration exception:', err);
    return [];
  }
}

/**
 * Toggle Pin to Top status on a feed post.
 */
export async function togglePostPinnedStatus(
  postId: number,
  isPinned: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Database unconfigured' };

  try {
    const { error } = await supabase
      .from('posts')
      .update({
        is_pinned: isPinned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) {
      console.warn('togglePostPinnedStatus error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('togglePostPinnedStatus exception:', err);
    return { success: false, error: err?.message || 'Failed to update pinned status.' };
  }
}

/**
 * Toggle soft-deleted status on a feed post (Hide / Restore).
 */
export async function togglePostDeletedStatus(
  postId: number,
  isDeleted: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Database unconfigured' };

  try {
    const { error } = await supabase
      .from('posts')
      .update({
        is_deleted: isDeleted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) {
      console.warn('togglePostDeletedStatus error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('togglePostDeletedStatus exception:', err);
    return { success: false, error: err?.message || 'Failed to update post deletion status.' };
  }
}

/**
 * Hard delete a post from database (for Super Admins).
 */
export async function hardDeletePost(postId: number): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Database unconfigured' };

  try {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) {
      console.warn('hardDeletePost error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('hardDeletePost exception:', err);
    return { success: false, error: err?.message || 'Failed to permanently delete post.' };
  }
}

/**
 * Fetch the last 50 entries from audit_logs table.
 * Enriched with actor names where available.
 */
export async function fetchSystemAuditLogs(params: {
  categoryFilter?: string;
  limit?: number;
} = {}): Promise<{ logs: SystemAuditLogItem[]; error?: string }> {
  if (!isSupabaseConfigured) return { logs: [] };

  const { categoryFilter = 'all', limit = 50 } = params;

  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        actor_profile_id,
        actor_auth_id,
        actor_role,
        action,
        entity_table,
        entity_id,
        old_values,
        new_values,
        reason,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (categoryFilter !== 'all') {
      query = query.ilike('action', `%${categoryFilter}%`);
    }

    const { data: rawLogs, error: logErr } = await query;

    if (logErr) {
      console.warn('fetchSystemAuditLogs error:', logErr.message);
      return { logs: [], error: logErr.message };
    }

    if (!rawLogs || rawLogs.length === 0) {
      return { logs: [] };
    }

    // Batch-fetch actor names
    const actorIds = Array.from(new Set(rawLogs.map((l: any) => Number(l.actor_profile_id)).filter(Boolean)));
    const actorMap = new Map<number, string>();

    if (actorIds.length > 0) {
      try {
        const { data: actors } = await supabase
          .from('alumni_profiles')
          .select('id, full_name')
          .in('id', actorIds);

        if (actors) {
          actors.forEach((a: any) => actorMap.set(Number(a.id), a.full_name));
        }
      } catch {}
    }

    const logs: SystemAuditLogItem[] = rawLogs.map((row: any) => ({
      id: Number(row.id),
      actorProfileId: row.actor_profile_id ? Number(row.actor_profile_id) : null,
      actorAuthId: row.actor_auth_id || null,
      actorRole: row.actor_role || null,
      actorName: row.actor_profile_id
        ? actorMap.get(Number(row.actor_profile_id)) || `Profile #${row.actor_profile_id}`
        : 'System / Trigger',
      action: row.action || 'AUDIT_EVENT',
      entityTable: row.entity_table || 'unknown',
      entityId: String(row.entity_id || ''),
      oldValues: row.old_values || null,
      newValues: row.new_values || null,
      reason: row.reason || null,
      createdAt: row.created_at || new Date().toISOString(),
    }));

    return { logs };
  } catch (err: any) {
    console.warn('fetchSystemAuditLogs exception:', err);
    return { logs: [], error: err?.message || 'Failed to fetch audit logs.' };
  }
}
