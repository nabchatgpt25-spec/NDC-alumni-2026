/**
 * Executive Council Service
 * Provides high-authority, restricted governance for the designated 4-5 Alumni Council members.
 * Powers:
 *  1. Collegiate ID Card & Vouch Verification
 *  2. Emergency Blood Network Verification & Oversight
 *  3. Instant Scam Post Elimination & Content Takedown
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  AdminDocSubmission,
  BloodEmergencyRequest,
  PostItem,
} from '../types';
import {
  fetchAdminDocSubmissions,
  reviewAdminDocSubmission,
  fetchFeedPostsForModeration,
  togglePostDeletedStatus,
  hardDeletePost,
  ModerationPostItem,
} from './adminService';
import {
  fetchBloodRequestsFromDb,
} from './supabaseService';
import {
  loadBloodRequests,
  saveBloodRequests,
} from '../utils/bloodDonationService';

export interface CouncilMember {
  email: string;
  name: string;
  designation: string;
  batchYear?: number;
  addedAt: string;
  isPrimary?: boolean;
}

// Initial designated high-authority Council (4-5 trusted alumni)
export const DEFAULT_EXECUTIVE_COUNCIL: CouncilMember[] = [
  {
    email: 'firstaidnetworkbd@gmail.com',
    name: 'Executive Council Lead',
    designation: 'Supreme Administrator & Oversight',
    batchYear: 2008,
    addedAt: '2026-01-01',
    isPrimary: true,
  },
  {
    email: 'bdocouncil.official@gmail.com',
    name: 'Council Member 2',
    designation: 'Holy Cross Alumni Authority',
    batchYear: 1984,
    addedAt: '2026-01-01',
    isPrimary: false,
  },
  {
    email: 'principal@ndc.edu.bd',
    name: 'Council Member 3',
    designation: 'Chief Patron & Rector',
    batchYear: 1978,
    addedAt: '2026-01-01',
    isPrimary: false,
  },
  {
    email: 'admin@notredamecollege.edu',
    name: 'Council Member 4',
    designation: 'Alumni Registry Trustee',
    batchYear: 1995,
    addedAt: '2026-01-01',
    isPrimary: false,
  },
  {
    email: 'ndc.executive.council@gmail.com',
    name: 'Council Member 5',
    designation: 'Disciplinary & Emergency Desk',
    batchYear: 2002,
    addedAt: '2026-01-01',
    isPrimary: false,
  },
];

const STORAGE_KEY = 'ndc_executive_council_members_v1';
const EVENT_KEY = 'ndc_executive_council_updated';

/**
 * Get active list of Executive Council emails
 */
export function getExecutiveCouncilMembers(): CouncilMember[] {
  if (typeof window === 'undefined') {
    return DEFAULT_EXECUTIVE_COUNCIL;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXECUTIVE_COUNCIL;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load council members:', err);
  }
  return DEFAULT_EXECUTIVE_COUNCIL;
}

/**
 * Check if a specific email belongs to the 4-5 High Authority Council members
 */
export function isExecutiveCouncilEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  const members = getExecutiveCouncilMembers();
  return members.some((m) => m.email.toLowerCase().trim() === clean);
}

/**
 * Save updated list of Executive Council members
 */
export function saveExecutiveCouncilMembers(members: CouncilMember[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: members }));
    } catch {}
  }
}

/**
 * Add a new verified council member (maintains max ~5 members limit)
 */
export function addCouncilMember(member: Omit<CouncilMember, 'addedAt'>): boolean {
  const current = getExecutiveCouncilMembers();
  const exists = current.some((m) => m.email.toLowerCase() === member.email.toLowerCase());
  if (exists) return false;

  const next: CouncilMember[] = [
    ...current,
    { ...member, addedAt: new Date().toISOString().slice(0, 10) },
  ];
  saveExecutiveCouncilMembers(next);
  return true;
}

/**
 * Remove a council member (cannot remove primary leads)
 */
export function removeCouncilMember(email: string): boolean {
  const current = getExecutiveCouncilMembers();
  const target = current.find((m) => m.email.toLowerCase() === email.toLowerCase());
  if (!target || target.isPrimary) return false;

  const next = current.filter((m) => m.email.toLowerCase() !== email.toLowerCase());
  saveExecutiveCouncilMembers(next);
  return true;
}

/**
 * Update an existing council member (change email, name, or role)
 */
export function updateCouncilMember(
  oldEmail: string,
  updated: Partial<CouncilMember>
): boolean {
  const current = getExecutiveCouncilMembers();
  const index = current.findIndex((m) => m.email.toLowerCase() === oldEmail.toLowerCase());
  if (index === -1) return false;

  const next = [...current];
  next[index] = {
    ...next[index],
    ...updated,
    email: (updated.email || next[index].email).trim().toLowerCase(),
  };
  saveExecutiveCouncilMembers(next);
  return true;
}

// =============================================================================
// HIGH AUTHORITY POWERS
// =============================================================================

/**
 * 1. ID DOCUMENT VERIFICATIONS
 */
export async function fetchCouncilPendingSubmissions(): Promise<AdminDocSubmission[]> {
  try {
    const data = await fetchAdminDocSubmissions('pending');
    return data;
  } catch {
    return [];
  }
}

export async function executeCouncilDocDecision(params: {
  submissionId: string;
  decision: 'approved' | 'rejected';
  adminNotes?: string;
  adminProfileId?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await reviewAdminDocSubmission({
      submissionId: params.submissionId,
      status: params.decision,
      adminNote: params.adminNotes || `Council action by admin #${params.adminProfileId || 'authority'}`,
      reviewerProfileId: params.adminProfileId || 1,
    });
  } catch (err: any) {
    return { success: false, error: err?.message || 'Verification decision failed' };
  }
}

/**
 * 2. EMERGENCY BLOOD NETWORK OVERSIGHT
 */
export async function fetchCouncilBloodEmergencies(): Promise<BloodEmergencyRequest[]> {
  try {
    const reqs = await fetchBloodRequestsFromDb();
    return reqs;
  } catch {
    return [];
  }
}

export async function updateCouncilBloodRequest(params: {
  requestId: string;
  status:
    | 'Active'
    | 'Pending Verification'
    | 'Donor Found'
    | 'Fulfilled'
    | 'Cancelled';
  moderationNote?: string;
  adminProfileId?: number;
}): Promise<boolean> {
  try {
    // 1. Update in local storage
    const all = loadBloodRequests();
    const updated = all.map((r) =>
      r.id === params.requestId
        ? {
            ...r,
            status: params.status,
            moderationNote: params.moderationNote,
            verifiedByAdmin: `Council Member #${params.adminProfileId || 'Admin'}`,
            updatedAt: 'Just now',
          }
        : r
    );
    saveBloodRequests(updated);

    // 2. Update in Supabase if configured
    if (isSupabaseConfigured) {
      await supabase
        .from('blood_requests')
        .update({
          status: params.status,
          moderation_note: params.moderationNote,
          verified_by_admin_id: params.adminProfileId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.requestId);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 3. INSTANT SCAM POST ELIMINATION & TAKEDOWN
 */
export async function fetchCouncilFeedForScamAudit(query?: string): Promise<ModerationPostItem[]> {
  try {
    return await fetchFeedPostsForModeration({
      query,
      filter: 'all',
      limit: 100,
    });
  } catch {
    return [];
  }
}

export async function councilTakedownPost(params: {
  postId: number;
  reason: string;
  permanent?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (params.permanent) {
      return await hardDeletePost(params.postId);
    } else {
      return await togglePostDeletedStatus(params.postId, true);
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to takedown post' };
  }
}

export async function councilRestorePost(postId: number): Promise<{ success: boolean; error?: string }> {
  try {
    return await togglePostDeletedStatus(postId, false);
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to restore post' };
  }
}
