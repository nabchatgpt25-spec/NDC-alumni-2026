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
 * Executive council and admin emails are granted full administrative access.
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
 * Determines if the current user can edit a specific gallery photograph.
 * - Main Admin has FULL access to edit any photograph (including archive and default pictures).
 * - Alumni can ONLY edit their own uploaded photographs.
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

  if (
    photo.uploaderName &&
    user.fullName &&
    photo.uploaderName.trim().toLowerCase() === user.fullName.trim().toLowerCase()
  ) {
    return true;
  }

  return false;
};

/**
 * Determines if the current user can delete a specific gallery photograph.
 * - Main Admin can delete any photograph.
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
 * - Main Admin has full access to edit any album.
 * - Original album creator can edit their album.
 */
export const canEditGalleryAlbum = (
  album: GalleryAlbum,
  user?: GalleryUserContext | null
): boolean => {
  if (!user || (!user.id && !user.userId)) return false;
  if (isMainAdmin(user)) return true;

  if (
    album.createdBy &&
    user.fullName &&
    album.createdBy.trim().toLowerCase() === user.fullName.trim().toLowerCase()
  ) {
    return true;
  }

  return false;
};

/**
 * Determines if the current user can delete a gallery album.
 * Restricted strictly to Main Admins.
 */
export const canDeleteGalleryAlbum = (
  album: GalleryAlbum,
  user?: GalleryUserContext | null
): boolean => {
  if (!user || (!user.id && !user.userId)) return false;
  return isMainAdmin(user);
};
