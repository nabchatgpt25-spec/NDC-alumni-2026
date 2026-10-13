import { AlumniProfile, BloodDonorProfile, BloodEmergencyRequest, GalleryPhoto, NotificationItem, PostComment, PostItem } from '../types';
import { createNotificationInDb, fetchNotificationsFromDb, markNotificationReadInDb } from '../services/supabaseService';
import { formatFacebookTime } from './facebookTime';
import { playSound } from './audio';

export const PORTAL_NOTIFICATIONS_STORAGE_KEY = 'ndc_portal_notifications';

/**
 * Loads stored local notifications from localStorage
 */
export function getLocalNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PORTAL_NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse notifications from storage', e);
  }
  return [];
}

/**
 * Saves local notifications to localStorage and dispatches sync event
 */
export function saveLocalNotifications(notifications: NotificationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTAL_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 100)));
    window.dispatchEvent(new CustomEvent('ndc_notifications_updated'));
  } catch (e) {
    console.warn('Failed to save notifications', e);
  }
}

/**
 * Core function to create, persist, and broadcast a notification across Supabase and client UI.
 * Does not notify the actor themselves (just like Facebook).
 */
export async function sendSocialNotification(params: {
  recipientId: number;
  actor: AlumniProfile;
  type: 'like' | 'comment' | 'blood' | 'system' | 'post' | 'verification';
  title: string;
  message: string;
  targetRoute?: string;
  postId?: number;
  photoId?: string;
  photoUrl?: string;
  bloodRequestId?: string;
  isMatchedDonorAlert?: boolean;
}): Promise<NotificationItem | null> {
  const actorId = Number(params.actor.id || params.actor.userId || 0);
  const recipientId = Number(params.recipientId);

  // Guard: Facebook doesn't send notifications to yourself when you like or comment on your own post
  if (!recipientId || recipientId <= 0 || (actorId > 0 && recipientId === actorId)) {
    return null;
  }

  const newId = Date.now() + Math.floor(Math.random() * 1000);
  const nowIso = new Date().toISOString();

  const notification: NotificationItem = {
    id: newId,
    title: params.title,
    message: params.message,
    timeAgo: 'Just now',
    unread: true,
    type: params.type,
    targetRoute: params.targetRoute || 'feed',
    targetUserId: recipientId,
    actorId: actorId > 0 ? actorId : undefined,
    actorName: params.actor.fullName,
    actorAvatar: params.actor.avatarUrl,
    postId: params.postId,
    photoId: params.photoId,
    photoUrl: params.photoUrl,
    bloodRequestId: params.bloodRequestId,
    isMatchedDonorAlert: params.isMatchedDonorAlert,
    createdAt: nowIso,
  };

  // 1. Add to local storage
  const current = getLocalNotifications();
  const updated = [notification, ...current.filter((n) => n.id !== newId)].slice(0, 100);
  saveLocalNotifications(updated);

  // 2. Play subtle chime if current logged in user is the recipient
  if (typeof window !== 'undefined') {
    try {
      const rawUser = localStorage.getItem('ndc_current_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const currentUid = Number(u.id || u.userId || 0);
        if (currentUid === recipientId) {
          playSound('notification');
        }
      }
    } catch {}
  }

  // 3. Persist to Supabase Database (if available)
  createNotificationInDb({
    recipientId,
    actorId: actorId > 0 ? actorId : undefined,
    type: params.type,
    title: params.title,
    message: params.message,
    targetRoute: params.targetRoute,
    postId: params.postId,
    bloodRequestId: params.bloodRequestId,
  }).catch((err) => {
    console.warn('createNotificationInDb background error:', err);
  });

  return notification;
}

/**
 * When an alumnus likes a post:
 * Sends a Facebook-style notification to the post's author:
 * "John Doe liked your post: '...'"
 */
export function notifyPostLike(post: PostItem, actor: AlumniProfile): Promise<NotificationItem | null> {
  const authorId = Number(post.userId || (post as any).authorId || 0);
  if (!authorId || authorId === Number(actor.id)) return Promise.resolve(null);

  const rawContent = (post.content || '').replace(/\s+/g, ' ').trim();
  const snippet = rawContent.length > 55 ? `${rawContent.slice(0, 55)}...` : rawContent;

  return sendSocialNotification({
    recipientId: authorId,
    actor,
    type: 'like',
    title: `${actor.fullName} liked your post.`,
    message: snippet ? `"${snippet}"` : 'Liked your shared post.',
    targetRoute: 'feed',
    postId: post.id,
    photoUrl: post.images && post.images.length > 0 ? post.images[0] : undefined,
  });
}

/**
 * When an alumnus comments on a post:
 * Sends a Facebook-style notification to the post's author:
 * "John Doe commented on your post: '...'"
 */
export function notifyPostComment(
  post: PostItem,
  commentText: string,
  actor: AlumniProfile
): Promise<NotificationItem | null> {
  const authorId = Number(post.userId || (post as any).authorId || 0);
  if (!authorId || authorId === Number(actor.id)) return Promise.resolve(null);

  const cleanText = commentText.replace(/\s+/g, ' ').trim();
  const snippet = cleanText.length > 60 ? `${cleanText.slice(0, 60)}...` : cleanText;

  return sendSocialNotification({
    recipientId: authorId,
    actor,
    type: 'comment',
    title: `${actor.fullName} commented on your post.`,
    message: snippet ? `"${snippet}"` : 'Added a new comment.',
    targetRoute: 'feed',
    postId: post.id,
    photoUrl: post.images && post.images.length > 0 ? post.images[0] : undefined,
  });
}

/**
 * When an alumnus replies to another alumnus's comment:
 * Sends notification to the parent comment author:
 * "John Doe replied to your comment: '...'"
 */
export function notifyCommentReply(
  post: PostItem,
  parentComment: PostComment,
  replyText: string,
  actor: AlumniProfile
): Promise<NotificationItem | null> {
  const recipientId = Number(parentComment.userId || (parentComment as any).authorId || 0);
  if (!recipientId || recipientId === Number(actor.id)) return Promise.resolve(null);

  const cleanText = replyText.replace(/\s+/g, ' ').trim();
  const snippet = cleanText.length > 60 ? `${cleanText.slice(0, 60)}...` : cleanText;

  return sendSocialNotification({
    recipientId,
    actor,
    type: 'comment',
    title: `${actor.fullName} replied to your comment.`,
    message: snippet ? `"${snippet}"` : 'Replied to your comment.',
    targetRoute: 'feed',
    postId: post.id,
  });
}

/**
 * When an alumnus likes a photo (in Gallery or Lightbox):
 * Sends a Facebook-style notification to the uploader:
 * "John Doe liked your photo."
 */
export function notifyPhotoLike(
  photo: GalleryPhoto,
  actor: AlumniProfile,
  albumTitle?: string
): Promise<NotificationItem | null> {
  const uploaderId = Number(photo.uploaderId || (photo as any).authorId || 0);
  if (!uploaderId || uploaderId === Number(actor.id)) return Promise.resolve(null);

  const caption = (photo.caption || '').trim();
  const message = caption
    ? `Liked "${caption.slice(0, 50)}"`
    : albumTitle
    ? `Liked your photo in album "${albumTitle}".`
    : 'Liked your photo.';

  return sendSocialNotification({
    recipientId: uploaderId,
    actor,
    type: 'like',
    title: `${actor.fullName} liked your photo.`,
    message,
    targetRoute: 'gallery',
    photoId: photo.id,
    photoUrl: photo.url,
  });
}

/**
 * When an alumnus comments on a photo:
 * Sends a notification to the uploader:
 * "John Doe commented on your photo."
 */
export function notifyPhotoComment(
  photo: GalleryPhoto,
  commentText: string,
  actor: AlumniProfile,
  albumTitle?: string
): Promise<NotificationItem | null> {
  const uploaderId = Number(photo.uploaderId || (photo as any).authorId || 0);
  if (!uploaderId || uploaderId === Number(actor.id)) return Promise.resolve(null);

  const cleanText = commentText.replace(/\s+/g, ' ').trim();
  const snippet = cleanText.length > 60 ? `${cleanText.slice(0, 60)}...` : cleanText;

  return sendSocialNotification({
    recipientId: uploaderId,
    actor,
    type: 'comment',
    title: `${actor.fullName} commented on your photo.`,
    message: snippet ? `"${snippet}"` : albumTitle ? `Commented on photo in "${albumTitle}".` : 'Commented on your photo.',
    targetRoute: 'gallery',
    photoId: photo.id,
    photoUrl: photo.url,
  });
}

/**
 * Specially notifies alumni who are matched for an emergency blood request.
 * Creates personalized high-urgency notifications for matched donors.
 */
export async function notifyMatchedBloodDonors(
  request: BloodEmergencyRequest,
  matchedDonors: BloodDonorProfile[],
  requester: AlumniProfile
): Promise<number> {
  let notifiedCount = 0;
  const requesterId = Number(requester.id || requester.userId || 0);

  for (const donor of matchedDonors) {
    const donorUserId = Number(donor.userId);
    if (!donorUserId || donorUserId === requesterId) continue;

    await sendSocialNotification({
      recipientId: donorUserId,
      actor: requester,
      type: 'blood',
      title: `🚨 Emergency Blood Match: ${request.bloodGroup} Needed!`,
      message: `${requester.fullName} urgently needs ${request.unitsRequired} unit(s) of ${request.bloodGroup} at ${request.hospitalName} (${request.hospitalArea}). You are a matched donor!`,
      targetRoute: 'emergency',
      bloodRequestId: request.id,
      isMatchedDonorAlert: true,
    });
    notifiedCount++;
  }

  return notifiedCount;
}

/**
 * Merges Supabase notifications and client local notifications for the active user,
 * formats all timestamps in authentic Facebook style, and sorts them newest first.
 */
export async function loadMergedNotifications(userId: number): Promise<NotificationItem[]> {
  const localList = getLocalNotifications();

  // Filter local items relevant to this user or general community alerts, excluding self-activity
  const userLocal = localList.filter((item) => {
    if (item.actorId && item.actorId === userId && item.type !== 'system' && !item.isMatchedDonorAlert) {
      return false;
    }
    if (!item.targetUserId) return true; // Community/portal broadcast
    return item.targetUserId === userId;
  });

  let dbList: NotificationItem[] = [];
  try {
    dbList = await fetchNotificationsFromDb(userId);
  } catch (err) {
    console.warn('fetchNotificationsFromDb error:', err);
  }

  // Deduplicate: merge matching notifications between local storage and database
  const map = new Map<string, NotificationItem>();

  for (const item of [...userLocal, ...dbList]) {
    // Generate semantic signature
    const signature = `${item.type}_${item.actorId || 0}_${item.postId || item.bloodRequestId || item.photoId || ''}_${(item.title || '').trim()}`;
    const key = signature.length > 5 ? signature : `id_${item.id}`;

    if (!map.has(key)) {
      map.set(key, {
        ...item,
        timeAgo: formatFacebookTime(item.createdAt || item.timeAgo),
      });
    } else {
      // Merge properties: if either was marked read, it stays read; preserve richer details
      const existing = map.get(key)!;
      const mergedItem: NotificationItem = {
        ...existing,
        ...item,
        // If either one has been marked as read, respect that it is read
        unread: existing.unread === false || item.unread === false ? false : Boolean(existing.unread && item.unread),
        actorName: item.actorName || existing.actorName,
        actorAvatar: item.actorAvatar || existing.actorAvatar,
        photoUrl: item.photoUrl || existing.photoUrl,
        createdAt: existing.createdAt || item.createdAt,
        timeAgo: formatFacebookTime(existing.createdAt || item.createdAt || existing.timeAgo),
      };
      map.set(key, mergedItem);
    }
  }

  const merged = Array.from(map.values());

  // Sort descending by creation date or id
  merged.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
    return timeB - timeA;
  });

  return merged;
}
