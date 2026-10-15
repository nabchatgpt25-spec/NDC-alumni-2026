import { AlumniProfile, BloodDonorProfile, BloodEmergencyRequest, GalleryPhoto, NotificationItem, PostComment, PostItem } from '../types';
import { createNotificationInDb, fetchNotificationsFromDb, markNotificationReadInDb } from '../services/supabaseService';
import { formatFacebookTime } from './facebookTime';
import { playSound } from './audio';
import { getUserPreferences } from './userPreferences';

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
 * STRICT RECIPIENT PRIVACY & ZERO SPAM:
 * - Always requires an exact, valid recipientId (> 0).
 * - Never notifies the user of their own actions (actorId === recipientId dropped immediately).
 * - Respects recipient notification preferences from Settings.
 */
export async function sendSocialNotification(params: {
  recipientId: number;
  actor: AlumniProfile;
  type: 'like' | 'comment' | 'blood' | 'system' | 'post' | 'verification' | 'mentorship' | 'career';
  title: string;
  message: string;
  targetRoute?: string;
  postId?: number;
  photoId?: string;
  photoUrl?: string;
  bloodRequestId?: string;
  isMatchedDonorAlert?: boolean;
  isOfficialNotice?: boolean;
}): Promise<NotificationItem | null> {
  const actorId = Number(params.actor.id || params.actor.userId || 0);
  const recipientId = Number(params.recipientId);

  // Strict Rule 1: Always set exact recipient_id (positive integer)
  if (!recipientId || recipientId <= 0) {
    return null;
  }

  // Strict Rule 2: Never notify the user of their own actions
  if (actorId > 0 && recipientId === actorId) {
    return null;
  }

  // Strict Rule 3: Respect user notification preferences from Settings
  if (typeof window !== 'undefined') {
    try {
      const rawUser = localStorage.getItem('ndc_current_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const currentUid = Number(u.id || u.userId || 0);
        // If recipient is currently the local active user, check their live settings
        if (currentUid === recipientId) {
          const prefs = getUserPreferences();
          if (prefs.in_app_notifications === false) {
            return null; // Muted completely by user choice
          }
          if (params.type === 'verification' && prefs.verification_alerts === false) {
            return null;
          }
          if (
            (params.type === 'mentorship' || params.type === 'career') &&
            prefs.mentorship_career_alerts === false
          ) {
            return null;
          }
        }
      }
    } catch {}
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
    targetRoute: params.targetRoute || (params.type === 'mentorship' ? 'mentorship' : params.type === 'career' ? 'career' : 'feed'),
    targetUserId: recipientId,
    actorId: actorId > 0 ? actorId : undefined,
    actorName: params.actor.fullName,
    actorAvatar: params.actor.avatarUrl,
    postId: params.postId,
    photoId: params.photoId,
    photoUrl: params.photoUrl,
    bloodRequestId: params.bloodRequestId,
    isMatchedDonorAlert: params.isMatchedDonorAlert,
    isOfficialNotice: params.isOfficialNotice,
    createdAt: nowIso,
  };

  // 1. Add to local storage
  const current = getLocalNotifications();
  const updated = [notification, ...current.filter((n) => n.id !== newId)].slice(0, 100);
  saveLocalNotifications(updated);

  // 2. Play subtle chime if current logged in user is the recipient and hasn't muted in-app alerts
  if (typeof window !== 'undefined') {
    try {
      const rawUser = localStorage.getItem('ndc_current_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const currentUid = Number(u.id || u.userId || 0);
        if (currentUid === recipientId) {
          const prefs = getUserPreferences();
          if (prefs.in_app_notifications !== false) {
            playSound('notification');
          }
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
 * STRICT ZERO SPAM & PREFERENCE ENFORCEMENT:
 * - If user disabled in-app notifications in Settings, returns empty list.
 * - Enforces exact recipient targeting (never broadcasts except rare official admin notices).
 * - Never includes self-actions.
 * - Filters out disabled preference categories (e.g. verification_alerts, mentorship_career_alerts).
 */
export async function loadMergedNotifications(userId: number): Promise<NotificationItem[]> {
  const prefs = getUserPreferences();

  // 1. If user disabled in-app notifications in Settings, respect choice and mute entirely
  if (prefs.in_app_notifications === false) {
    return [];
  }

  const localList = getLocalNotifications();

  // 2. Strict Recipient & Zero Spam Filter:
  // - Must match current recipient userId (or rare official admin notice with no targetUserId)
  // - Never notify user of their own actions
  // - Respect category preference toggles
  const userLocal = localList.filter((item) => {
    // Never notify user of their own actions
    if (item.actorId && item.actorId === userId) {
      return false;
    }

    // Strict recipient targeting:
    if (item.targetUserId) {
      if (item.targetUserId !== userId) return false;
    } else {
      // If no targetUserId: Only rare official admin notices are allowed through
      if (!(item.type === 'system' && item.isOfficialNotice)) {
        return false;
      }
    }

    // Category preferences
    if (item.type === 'verification' && prefs.verification_alerts === false) {
      return false;
    }
    if ((item.type === 'mentorship' || item.type === 'career') && prefs.mentorship_career_alerts === false) {
      return false;
    }

    return true;
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
    // Category preferences check on dbList as well
    if (item.type === 'verification' && prefs.verification_alerts === false) {
      continue;
    }
    if ((item.type === 'mentorship' || item.type === 'career') && prefs.mentorship_career_alerts === false) {
      continue;
    }
    if (item.actorId && item.actorId === userId) {
      continue;
    }

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

/**
 * 1. Mentorship: When a user asks a mentor a question:
 * STRICT 1-to-1: Notifies ONLY that specific mentor.
 * Does NOT broadcast to any other users.
 * Never notifies the user of their own actions.
 * Respects mentor's notification preferences.
 */
export async function notifyMentorshipQuestion(params: {
  mentorId: number;
  mentorName: string;
  questionText: string;
  topic: string;
  actor: AlumniProfile;
}): Promise<NotificationItem | null> {
  const mentorId = Number(params.mentorId);
  const actorId = Number(params.actor.id || params.actor.userId || 0);

  // Strict targeting: must have valid positive recipient and cannot notify self
  if (!mentorId || mentorId <= 0 || (actorId > 0 && mentorId === actorId)) {
    return null;
  }

  const cleanText = params.questionText.replace(/\s+/g, ' ').trim();
  const snippet = cleanText.length > 70 ? `${cleanText.slice(0, 70)}...` : cleanText;

  return sendSocialNotification({
    recipientId: mentorId,
    actor: params.actor,
    type: 'mentorship',
    title: `${params.actor.fullName} asked you for mentorship advice (${params.topic}).`,
    message: snippet ? `"${snippet}"` : 'Asked you a direct mentorship question.',
    targetRoute: 'mentorship',
  });
}

/**
 * 1. Mentorship: When a mentor replies to a mentorship question:
 * STRICT 1-to-1: Notifies ONLY the original requester.
 * Does NOT broadcast to any other users.
 * Never notifies the mentor of their own reply.
 * Respects requester's notification preferences.
 */
export async function notifyMentorshipAnswer(params: {
  requesterId: number;
  answerText: string;
  actor: AlumniProfile;
}): Promise<NotificationItem | null> {
  const requesterId = Number(params.requesterId);
  const actorId = Number(params.actor.id || params.actor.userId || 0);

  // Strict targeting: must have valid positive recipient and cannot notify self
  if (!requesterId || requesterId <= 0 || (actorId > 0 && requesterId === actorId)) {
    return null;
  }

  const cleanText = params.answerText.replace(/\s+/g, ' ').trim();
  const snippet = cleanText.length > 70 ? `${cleanText.slice(0, 70)}...` : cleanText;

  return sendSocialNotification({
    recipientId: requesterId,
    actor: params.actor,
    type: 'mentorship',
    title: `${params.actor.fullName} answered your mentorship question.`,
    message: snippet ? `"${snippet}"` : 'Provided senior advice to your question.',
    targetRoute: 'mentorship',
  });
}

/**
 * 2. Career Portal: When an alumnus applies to a job:
 * STRICT 1-to-1: Notifies ONLY the job poster.
 * Does NOT broadcast to any other users.
 * Never notifies the user of their own actions.
 * Respects job poster's notification preferences.
 */
export async function notifyCareerApplication(params: {
  posterId: number;
  jobTitle: string;
  company: string;
  actor: AlumniProfile;
}): Promise<NotificationItem | null> {
  const posterId = Number(params.posterId);
  const actorId = Number(params.actor.id || params.actor.userId || 0);

  // Strict targeting: must have valid positive recipient and cannot notify self
  if (!posterId || posterId <= 0 || (actorId > 0 && posterId === actorId)) {
    return null;
  }

  return sendSocialNotification({
    recipientId: posterId,
    actor: params.actor,
    type: 'career',
    title: `New Job Application: ${params.jobTitle}`,
    message: `${params.actor.fullName} (${params.actor.batchYear ? `HSC ${params.actor.batchYear}` : 'Alum'}) applied for ${params.jobTitle} at ${params.company}.`,
    targetRoute: 'career',
  });
}
