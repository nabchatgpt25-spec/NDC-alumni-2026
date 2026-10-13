import { AlumniProfile, PostItem } from '../types';
import { createFeedPostInDb } from '../services/supabaseService';

export interface ProfilePhotoPostParams {
  alumnus: AlumniProfile;
  photoUrl: string;
  caption?: string;
  forceFirstTime?: boolean;
}

/**
 * Checks whether a post represents a Facebook-style profile photo update.
 */
export function isProfilePhotoPost(post: {
  content?: string;
  postType?: string;
  link_metadata?: any;
  category?: string;
}): boolean {
  if (!post) return false;
  if (post.postType === 'profile_photo_update') return true;
  if (post.link_metadata?.postType === 'profile_photo_update') return true;
  if (post.link_metadata?.isProfilePhotoUpdate) return true;

  const category = (post.category || '').toLowerCase();
  if (
    category === 'profile photo' ||
    category === 'profile picture' ||
    category === 'profile photo update' ||
    category === 'profile update'
  ) {
    return true;
  }

  if (typeof post.content === 'string') {
    const text = post.content.toLowerCase();
    if (
      text.includes('updated their profile picture') ||
      text.includes('added a profile picture') ||
      text.includes('updated profile picture') ||
      text.includes('added a new profile photo') ||
      text.includes('changed their profile picture') ||
      text.includes('changed profile picture') ||
      text.includes('new profile picture') ||
      text.includes('uploaded a profile picture') ||
      text.includes('প্রোফাইল ছবি')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Disabled: Users do not want automatic profile photo posts when changing or setting an avatar.
 */
export async function publishProfilePhotoPost({
  alumnus,
  photoUrl,
  caption,
  forceFirstTime,
}: ProfilePhotoPostParams): Promise<PostItem | null> {
  return null;
}
