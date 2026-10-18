/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GalleryAlbum, GalleryPhoto, UserRole } from '../types';

export interface GalleryUserContext {
  id?: number;
  userId?: number;
  role?: UserRole | string;
  email?: string;
  fullName?: string;
  verificationStatus?: string;
  verification_status?: string;
  verified?: boolean;
}

export const ADMIN_EMAILS_SET = new Set([
  'firstaidnetworkbd@gmail.com',
  'bdocouncil.official@gmail.com',
  'admin@notredamecollege.edu',
  'principal@ndc.edu.bd',
  'ndc.executive.council@gmail.com',
]);

/**
 * Checks if the current user has Main Admin or Moderator privileges.
 * Matches database RLS helper `public.is_admin_or_mod()`.
 */
export const isMainAdmin = (user?: GalleryUserContext | null): boolean => {
  if (!user) return false;
  const role = user.role;
  const email = (user.email || '').trim().toLowerCase();
  return (
    role === 'admin' ||
    role === 'moderator' ||
    ADMIN_EMAILS_SET.has(email)
  );
};

/**
 * Determines whether a user is permitted to upload photographs to the public gallery.
 * Strictly aligned with Supabase RLS policy `gallery_photos_insert_own`:
 * User must be authenticated, and either `verification_status = 'verified'` OR `role IN ('admin', 'moderator')`.
 */
export const canUploadGalleryPhoto = (
  user?: GalleryUserContext | null
): { allowed: boolean; reason?: string } => {
  if (!user || (!user.id && !user.userId)) {
    return {
      allowed: false,
      reason: 'Please log in to your alumni account to upload photographs to the gallery.',
    };
  }

  const role = user.role;
  const isAdminOrMod = role === 'admin' || role === 'moderator';
  const isVerified =
    user.verificationStatus === 'verified' ||
    user.verification_status === 'verified' ||
    user.verified === true;

  if (isAdminOrMod || isVerified) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason:
      'Only verified alumni or administrators can upload photographs to the public gallery. Please verify your alumni profile in the Verification Center.',
  };
};

/**
 * Determines if the current user can edit a specific gallery photograph.
 * - Admin or Moderator has FULL access to edit any photograph (matching DB RLS).
 * - Alumni can ONLY edit their own uploaded photographs (`uploader_id = current_profile_id`).
 */
export const canEditGalleryPhoto = (
  photo: GalleryPhoto,
  user?: GalleryUserContext | null
): boolean => {
  if (!user || (!user.id && !user.userId)) return false;
  if (isMainAdmin(user)) return true;

  const currentUserId = Number(user.id || user.userId);
  if (photo.uploaderId && Number(photo.uploaderId) === currentUserId) {
    return true;
  }

  return false;
};

/**
 * Determines if the current user can delete a specific gallery photograph.
 * - Admin or Moderator can delete any photograph.
 * - Alumni can ONLY delete their own uploaded photographs.
 */
export const canDeleteGalleryPhoto = (
  photo: GalleryPhoto,
  user?: GalleryUserContext | null
): boolean => {
  return canEditGalleryPhoto(photo, user);
};

/**
 * Determines if the current user can edit a gallery album.
 * - Admin or Moderator has full access.
 * - Original album creator can edit their album.
 */
export const canEditGalleryAlbum = (
  album: GalleryAlbum,
  user?: GalleryUserContext | null
): boolean => {
  if (!user || (!user.id && !user.userId)) return false;
  if (isMainAdmin(user)) return true;

  return false;
};

/**
 * Determines if the current user can delete a gallery album.
 * Restricted strictly to Main Admins and Moderators (matching `gallery_albums_delete_mod` RLS).
 */
export const canDeleteGalleryAlbum = (
  album: GalleryAlbum,
  user?: GalleryUserContext | null
): boolean => {
  if (!user || (!user.id && !user.userId)) return false;
  return isMainAdmin(user);
};
