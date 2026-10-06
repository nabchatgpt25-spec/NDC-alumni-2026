import { AlumniProfile, PostItem } from '../types';
import { loadStoredAlumniProfiles } from '../data/mockData';

export const CACHED_DIRECTORY_KEY = 'ndc_cached_directory';
export const CACHED_DIRECTORY_TIMESTAMP_KEY = 'ndc_cached_directory_timestamp';
export const SAVED_POSTS_KEY = 'ndc_cached_saved_posts';
export const SAVED_POST_IDS_KEY = 'ndc_saved_post_ids';

/**
 * Initial offline fallback directory dataset.
 * Production starts with empty list []; populated only with real registered alumni.
 */
export const INITIAL_OFFLINE_DIRECTORY: AlumniProfile[] = [];

/**
 * Initial offline fallback saved posts for Notre Dame College.
 * Production starts with empty list []; populated only with real posts.
 */
export const INITIAL_OFFLINE_SAVED_POSTS: PostItem[] = [];

export function getCachedDirectory(): AlumniProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = loadStoredAlumniProfiles();
    const raw = localStorage.getItem(CACHED_DIRECTORY_KEY);
    const parsedCached: AlumniProfile[] = raw ? JSON.parse(raw) : [];

    const combined = [
      ...stored,
      ...(Array.isArray(parsedCached) ? parsedCached : []),
    ];

    const uniqueMap = new Map<number, AlumniProfile>();
    combined.forEach((p) => {
      if (!p || typeof p.id !== 'number') return;
      if (
        (p.id >= 101 && p.id <= 120) ||
        (p.id >= 1001 && p.id <= 1006) ||
        (p.id >= 800000 && p.id <= 999999)
      ) {
        return;
      }
      const normalizedCity = p.city === 'Mountain View, CA' ? 'Mountain View' : p.city;
      if (!uniqueMap.has(p.id)) {
        uniqueMap.set(p.id, {
          ...p,
          id: p.id,
          userId: p.userId || p.id,
          city: normalizedCity,
        });
      }
    });

    return Array.from(uniqueMap.values());
  } catch (e) {
    console.warn('Failed to parse cached directory', e);
  }
  return [];
}

export function saveCachedDirectory(profiles: AlumniProfile[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHED_DIRECTORY_KEY, JSON.stringify(profiles));
    localStorage.setItem(CACHED_DIRECTORY_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.warn('Failed to cache directory', e);
  }
}

export function cacheDirectory(profiles: AlumniProfile[]) {
  saveCachedDirectory(profiles);
}

export function getDirectoryCacheTimestamp(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHED_DIRECTORY_TIMESTAMP_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export function getSavedPosts(): PostItem[] {
  if (typeof window === 'undefined') return INITIAL_OFFLINE_SAVED_POSTS;
  try {
    const raw = localStorage.getItem(SAVED_POSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse saved posts', e);
  }
  return INITIAL_OFFLINE_SAVED_POSTS;
}

export function saveSavedPosts(posts: PostItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(posts));
  } catch (e) {
    console.warn('Failed to cache saved posts', e);
  }
}

export function getSavedPostIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_POST_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse saved post ids', e);
  }
  return [];
}

export function toggleSavedPostId(postId: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const ids = getSavedPostIds();
    const idx = ids.indexOf(postId);
    let isSavedNow = false;
    if (idx > -1) {
      ids.splice(idx, 1);
      isSavedNow = false;
    } else {
      ids.push(postId);
      isSavedNow = true;
    }
    localStorage.setItem(SAVED_POST_IDS_KEY, JSON.stringify(ids));
    return isSavedNow;
  } catch (e) {
    console.warn('Failed to toggle saved post', e);
    return false;
  }
}

export function isPostSaved(postId: number): boolean {
  const ids = getSavedPostIds();
  return ids.includes(postId);
}

export function setSavedPosts(posts: PostItem[]) {
  saveSavedPosts(posts);
}

export function toggleSavePost(post: PostItem): boolean {
  const isSavedNow = toggleSavedPostId(post.id);
  const currentSaved = getSavedPosts();
  if (isSavedNow) {
    if (!currentSaved.some((p) => p.id === post.id)) {
      currentSaved.unshift({ ...post, isSaved: true });
    }
  } else {
    const idx = currentSaved.findIndex((p) => p.id === post.id);
    if (idx > -1) {
      currentSaved.splice(idx, 1);
    }
  }
  saveSavedPosts(currentSaved);
  return isSavedNow;
}

