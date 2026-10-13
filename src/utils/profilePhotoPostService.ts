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
}): boolean {
  if (post.postType === 'profile_photo_update') return true;
  if (post.link_metadata?.postType === 'profile_photo_update') return true;
  if (post.link_metadata?.isProfilePhotoUpdate) return true;

  if (typeof post.content === 'string') {
    const text = post.content.toLowerCase();
    if (
      text.includes('updated their profile picture') ||
      text.includes('added a profile picture') ||
      text.includes('updated profile picture') ||
      text.includes('added a new profile photo')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Automatically creates and broadcasts a Facebook-style post when an alumnus
 * first uploads or subsequently changes their profile picture.
 */
export async function publishProfilePhotoPost({
  alumnus,
  photoUrl,
  caption,
  forceFirstTime,
}: ProfilePhotoPostParams): Promise<PostItem> {
  const alumnusId = Number(alumnus.id || alumnus.userId || 0);
  const storageKey = `ndc_avatar_posted_${alumnusId > 0 ? alumnusId : 'current'}`;

  // Determine if it is the first upload vs subsequent change
  let isFirstTime = false;
  if (forceFirstTime !== undefined) {
    isFirstTime = forceFirstTime;
  } else if (typeof window !== 'undefined') {
    const hasPostedBefore = localStorage.getItem(storageKey) === 'true';
    const isDefaultAvatar =
      !alumnus.avatarUrl ||
      alumnus.avatarUrl === '/ndc-logo.png' ||
      alumnus.avatarUrl.includes('ndc-logo') ||
      alumnus.avatarUrl.includes('photo-1535713875002-d1d0cf377fde');
    isFirstTime = !hasPostedBefore || isDefaultAvatar;
  }

  const actionText = isFirstTime
    ? 'added a profile picture.'
    : 'updated their profile picture.';

  const trimmedCaption = caption ? caption.trim() : '';
  const postContent = trimmedCaption || (isFirstTime ? 'Added a new profile photo.' : 'Updated profile picture.');

  const tempPostId = -Date.now();
  const optimisticPost: PostItem = {
    id: tempPostId,
    userId: alumnusId,
    fullName: alumnus.fullName || 'Notredamian Alumnus',
    avatarUrl: photoUrl,
    batchYear: alumnus.batchYear || 0,
    content: postContent,
    images: [photoUrl],
    videos: [],
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date().toISOString(),
    likedByMe: false,
    comments: [],
    category: 'General Update',
    isEdited: false,
    postType: 'profile_photo_update',
    link_metadata: {
      postType: 'profile_photo_update',
      isFirstUpload: isFirstTime,
      actionText,
      caption: trimmedCaption,
      photoUrl,
      updatedAt: new Date().toISOString(),
    },
  };

  if (typeof window !== 'undefined') {
    // Save marker that this alumnus has uploaded/posted
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {}

    // Persist optimistic post to offline storage
    try {
      const stored = localStorage.getItem('ndc_alumni_posts');
      const posts: PostItem[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem('ndc_alumni_posts', JSON.stringify([optimisticPost, ...posts]));
    } catch {}

    // Broadcast globally to all views (FeedView, ProfileView, etc.)
    window.dispatchEvent(
      new CustomEvent('ndc_post_created', {
        detail: { post: optimisticPost },
      })
    );
  }

  // Persist to Supabase database (single source of truth)
  try {
    const res = await createFeedPostInDb({
      authorId: alumnusId,
      content: postContent,
      category: 'General Update',
      images: [photoUrl],
      link_metadata: {
        postType: 'profile_photo_update',
        isFirstUpload: isFirstTime,
        actionText,
        caption: trimmedCaption,
        photoUrl,
        updatedAt: new Date().toISOString(),
      },
    });

    if (res.success && res.post) {
      const dbPost: PostItem = {
        ...res.post,
        avatarUrl: photoUrl,
        postType: 'profile_photo_update',
        link_metadata: {
          postType: 'profile_photo_update',
          isFirstUpload: isFirstTime,
          actionText,
          caption: trimmedCaption,
          photoUrl,
          updatedAt: new Date().toISOString(),
        },
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ndc_post_created', {
            detail: { post: dbPost, replaceTempId: tempPostId },
          })
        );
      }
      return dbPost;
    }
  } catch (err) {
    console.warn('Could not persist profile photo post to database:', err);
  }

  return optimisticPost;
}
