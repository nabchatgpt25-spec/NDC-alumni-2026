/**
 * Small Admin & Community Moderation Service
 * Manages delegated Small Admins (Sub-Admins/Moderators), their permissions,
 * alumni verification capabilities, and bad post deletion tools.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AlumniProfile } from '../types';
import { loadStoredAlumniProfiles, saveStoredAlumniProfiles } from '../data/mockData';
import { loadVouchRequests, saveVouchRequests } from '../utils/verificationService';

export const SMALL_ADMINS_STORAGE_KEY = 'ndc_small_admins_list';

export interface SmallAdminPermissions {
  canVerifyAlumni: boolean;
  canDeletePosts: boolean;
  canViewDirectory: boolean;
}

export interface SmallAdminUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: 'moderator';
  appointedAt: string;
  appointedBy: string;
  isActive: boolean;
  permissions: SmallAdminPermissions;
  notes?: string;
}

/**
 * Pre-seeded default Small Admins.
 * As requested, nurulanambashir25@ is the founding small admin with full sub-admin powers.
 */
export const DEFAULT_SMALL_ADMINS: SmallAdminUser[] = [
  {
    id: 'sa-nurulanambashir25',
    email: 'nurulanambashir25@gmail.com',
    fullName: 'Nurul Anam Bashir',
    avatarUrl: '/ndc-logo.png',
    role: 'moderator',
    appointedAt: '2026-10-16T00:00:00.000Z',
    appointedBy: 'Central Administration Hub',
    isActive: true,
    permissions: {
      canVerifyAlumni: true,
      canDeletePosts: true,
      canViewDirectory: true,
    },
    notes: 'Founding Small Admin appointed with alumni verification and bad-post deletion authority.',
  },
];

/**
 * Retrieves the current list of appointed Small Admins from localStorage,
 * falling back to DEFAULT_SMALL_ADMINS.
 */
export function getSmallAdminsList(): SmallAdminUser[] {
  if (typeof window === 'undefined') return DEFAULT_SMALL_ADMINS;

  try {
    const raw = localStorage.getItem(SMALL_ADMINS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SMALL_ADMINS_STORAGE_KEY, JSON.stringify(DEFAULT_SMALL_ADMINS));
      return DEFAULT_SMALL_ADMINS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure nurulanambashir25 is always present
      const hasFounding = parsed.some(
        (adm) =>
          adm.email &&
          (adm.email.toLowerCase().includes('nurulanambashir25') ||
            adm.email.toLowerCase().startsWith('nurulanambashir25@'))
      );
      if (!hasFounding) {
        const merged = [...DEFAULT_SMALL_ADMINS, ...parsed];
        localStorage.setItem(SMALL_ADMINS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Error reading small admins from storage:', e);
  }

  return DEFAULT_SMALL_ADMINS;
}

/**
 * Persists the Small Admins list to storage and notifies listeners.
 */
export function saveSmallAdminsList(list: SmallAdminUser[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SMALL_ADMINS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('ndc_small_admins_updated', { detail: { list } }));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Error saving small admins list:', e);
  }
}

/**
 * Checks whether a given email address qualifies as an appointed Small Admin.
 * Handles prefix match (nurulanambashir25@), exact match, or appointed list match.
 */
export function isSmallAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();

  // Direct check for nurulanambashir25 (with or without domain suffix)
  if (
    clean === 'nurulanambashir25@' ||
    clean.startsWith('nurulanambashir25@') ||
    clean.includes('nurulanambashir25')
  ) {
    return true;
  }

  const list = getSmallAdminsList();
  return list.some(
    (sa) =>
      sa.isActive &&
      (sa.email.toLowerCase().trim() === clean ||
        clean.startsWith(sa.email.toLowerCase().trim().replace(/@.*$/, '@')))
  );
}

/**
 * Validates whether an alumni profile belongs to a Small Admin / Moderator.
 */
export function isAlumnusSmallAdmin(profile?: AlumniProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === 'moderator') return true;
  return isSmallAdminEmail(profile.email);
}

/**
 * Appoint a new Small Admin from the Main Admin System.
 */
export async function appointSmallAdmin(params: {
  email: string;
  fullName?: string;
  permissions?: Partial<SmallAdminPermissions>;
  notes?: string;
  appointedBy?: string;
}): Promise<{ success: boolean; user?: SmallAdminUser; error?: string }> {
  const cleanEmail = params.email.toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address (e.g. alumnus@gmail.com).' };
  }

  const list = getSmallAdminsList();
  const existingIndex = list.findIndex(
    (sa) => sa.email.toLowerCase().trim() === cleanEmail
  );

  const newAdmin: SmallAdminUser = {
    id: existingIndex >= 0 ? list[existingIndex].id : `sa-${Date.now()}`,
    email: cleanEmail,
    fullName: params.fullName?.trim() || cleanEmail.split('@')[0],
    role: 'moderator',
    appointedAt: new Date().toISOString(),
    appointedBy: params.appointedBy || 'Super Admin',
    isActive: true,
    permissions: {
      canVerifyAlumni: params.permissions?.canVerifyAlumni !== false,
      canDeletePosts: params.permissions?.canDeletePosts !== false,
      canViewDirectory: params.permissions?.canViewDirectory !== false,
    },
    notes: params.notes?.trim() || 'Appointed from Central Admin Hub',
  };

  if (existingIndex >= 0) {
    list[existingIndex] = newAdmin;
  } else {
    list.unshift(newAdmin);
  }

  saveSmallAdminsList(list);

  // Sync with Supabase: if an alumnus profile with this email exists, upgrade role to 'moderator'
  if (isSupabaseConfigured) {
    try {
      const { data: matchedProfiles } = await supabase
        .from('alumni_profiles')
        .select('id, full_name, email, role')
        .ilike('email', cleanEmail)
        .limit(1);

      if (matchedProfiles && matchedProfiles.length > 0) {
        const target = matchedProfiles[0];
        if (target.role !== 'admin') {
          await supabase
            .from('alumni_profiles')
            .update({ role: 'moderator', updated_at: new Date().toISOString() })
            .eq('id', target.id);
        }
      }
    } catch (e) {
      console.warn('Could not update role in Supabase for appointed small admin:', e);
    }
  }

  return { success: true, user: newAdmin };
}

/**
 * Revoke or remove an appointed Small Admin.
 */
export async function removeSmallAdmin(
  idOrEmail: string
): Promise<{ success: boolean; error?: string }> {
  const clean = idOrEmail.toLowerCase().trim();
  const list = getSmallAdminsList();

  const filtered = list.filter(
    (sa) =>
      sa.id !== idOrEmail &&
      sa.email.toLowerCase().trim() !== clean
  );

  if (filtered.length === list.length) {
    return { success: false, error: 'Small admin not found.' };
  }

  saveSmallAdminsList(filtered);

  // Optional: Downgrade in Supabase if found
  if (isSupabaseConfigured && clean.includes('@')) {
    try {
      const { data: matched } = await supabase
        .from('alumni_profiles')
        .select('id, role')
        .ilike('email', clean)
        .limit(1);

      if (matched && matched.length > 0 && matched[0].role === 'moderator') {
        await supabase
          .from('alumni_profiles')
          .update({ role: 'member', updated_at: new Date().toISOString() })
          .eq('id', matched[0].id);
      }
    } catch (e) {
      console.warn('Could not reset role in Supabase:', e);
    }
  }

  return { success: true };
}

/**
 * Toggle active status of a Small Admin.
 */
export function toggleSmallAdminStatus(id: string, active: boolean): boolean {
  const list = getSmallAdminsList();
  const target = list.find((sa) => sa.id === id);
  if (!target) return false;

  target.isActive = active;
  saveSmallAdminsList(list);
  return true;
}

/**
 * Action: Small Admin verifies an alumnus profile.
 * Sets verificationStatus = 'verified', verificationMethod = 'admin_verified',
 * adds small admin name to verifiedBy, and updates database + storage.
 */
export async function smallAdminVerifyAlumnus(params: {
  targetUserId: number;
  smallAdminName: string;
  smallAdminProfileId?: number;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { targetUserId, smallAdminName, note } = params;

  const verifiedByBadge = `Small Admin Verified (${smallAdminName})`;

  // 1. Update Supabase if available
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('alumni_profiles')
        .update({
          verification_status: 'verified',
          verification_method: 'admin_verified',
          verification_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId);

      if (error) {
        console.warn('Supabase profile verification update error:', error.message);
      }
    } catch (dbErr) {
      console.warn('Database error while small admin verified alumnus:', dbErr);
    }

    // Also update any pending vouch requests or doc submissions for this user
    try {
      await supabase
        .from('verification_requests')
        .update({ status: 'verified', updated_at: new Date().toISOString() })
        .eq('requester_id', targetUserId);
    } catch {}

    try {
      await supabase
        .from('admin_doc_submissions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          admin_note: note || `Approved by Small Admin (${smallAdminName})`,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', targetUserId)
        .eq('status', 'pending');
    } catch {}
  }

  // 2. Update local storage mock profiles for fast UI sync
  try {
    const localProfiles = loadStoredAlumniProfiles();
    const targetIdx = localProfiles.findIndex((p) => p.id === targetUserId || p.userId === targetUserId);
    if (targetIdx >= 0) {
      localProfiles[targetIdx] = {
        ...localProfiles[targetIdx],
        verificationStatus: 'verified',
        verificationMethod: 'admin_verified',
        verificationDate: 'Today',
        verifiedBy: [verifiedByBadge, ...(localProfiles[targetIdx].verifiedBy || [])],
        badges: Array.from(new Set([...(localProfiles[targetIdx].badges || []), 'Verified Notredamian'])),
      };
      saveStoredAlumniProfiles(localProfiles);
    }

    // Also resolve any pending vouch requests in local storage
    const vouchReqs = loadVouchRequests();
    const reqIdx = vouchReqs.findIndex((r) => r.requesterId === targetUserId);
    if (reqIdx >= 0) {
      vouchReqs[reqIdx] = {
        ...vouchReqs[reqIdx],
        status: 'verified',
        adminNote: `Verified by Small Admin (${smallAdminName})`,
      };
      saveVouchRequests(vouchReqs);
    }

    window.dispatchEvent(new CustomEvent('ndc_alumni_verified', { detail: { userId: targetUserId } }));
    window.dispatchEvent(new Event('storage'));
  } catch (storageErr) {
    console.warn('Local storage update error in smallAdminVerifyAlumnus:', storageErr);
  }

  return { success: true };
}

/**
 * Action: Small Admin deletes / hides an unwanted or bad post.
 * Soft deletes post in Supabase (is_deleted = true) and updates local post storage.
 */
export async function smallAdminDeleteBadPost(params: {
  postId: number;
  smallAdminName: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { postId, smallAdminName, reason } = params;

  // 1. Supabase update
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) {
        console.warn('Supabase post delete error:', error.message);
      }
    } catch (e) {
      console.warn('Database error in smallAdminDeleteBadPost:', e);
    }
  }

  // 2. Update local storage posts so it instantly disappears from feed
  if (typeof window !== 'undefined') {
    try {
      const rawPosts = localStorage.getItem('ndc_alumni_posts');
      if (rawPosts) {
        const posts = JSON.parse(rawPosts);
        if (Array.isArray(posts)) {
          const updated = posts.map((p: any) =>
            p.id === postId ? { ...p, isDeleted: true, is_deleted: true } : p
          );
          localStorage.setItem('ndc_alumni_posts', JSON.stringify(updated));
        }
      }
      window.dispatchEvent(
        new CustomEvent('ndc_post_deleted', {
          detail: { postId, reason, deletedBy: smallAdminName },
        })
      );
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('LocalStorage error in smallAdminDeleteBadPost:', e);
    }
  }

  return { success: true };
}

/**
 * Action: Small Admin restores a previously deleted post.
 */
export async function smallAdminRestorePost(
  postId: number
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          is_deleted: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) {
        console.warn('Supabase post restore error:', error.message);
      }
    } catch (e) {
      console.warn('Database error in smallAdminRestorePost:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const rawPosts = localStorage.getItem('ndc_alumni_posts');
      if (rawPosts) {
        const posts = JSON.parse(rawPosts);
        if (Array.isArray(posts)) {
          const updated = posts.map((p: any) =>
            p.id === postId ? { ...p, isDeleted: false, is_deleted: false } : p
          );
          localStorage.setItem('ndc_alumni_posts', JSON.stringify(updated));
        }
      }
      window.dispatchEvent(new CustomEvent('ndc_post_restored', { detail: { postId } }));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  }

  return { success: true };
}
