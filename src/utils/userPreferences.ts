/**
 * Unified User Preferences Management System
 * Persists app settings with safe local storage fallback (ndc_user_prefs)
 * and abstract hooks for seamless database synchronization.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface UserPreferences {
  // App Preferences
  autoplay_videos_on_scroll: boolean;
  bg_music_enabled: boolean;
  bg_music_muted_default: boolean;
  reduced_motion: boolean;
  compact_layout: boolean;

  // Notifications
  email_notifications: boolean;
  in_app_notifications: boolean;
  verification_alerts: boolean;

  // Privacy
  is_public: boolean;
  show_contact_to_verified: boolean;
  allow_search_discovery: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  autoplay_videos_on_scroll: true,
  bg_music_enabled: true,
  bg_music_muted_default: false,
  reduced_motion: false,
  compact_layout: false,

  email_notifications: true,
  in_app_notifications: true,
  verification_alerts: true,

  is_public: true,
  show_contact_to_verified: true,
  allow_search_discovery: true,
};

const PREFS_STORAGE_KEY = 'ndc_user_prefs';

/**
 * Synchronously retrieves current user preferences with safe fallback
 */
export function getUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_USER_PREFERENCES };
  }
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_PREFERENCES };
    const parsed = JSON.parse(raw);
    const hasExplicitChoice = localStorage.getItem('ndc_autoplay_explicitly_set');
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...parsed,
      autoplay_videos_on_scroll: hasExplicitChoice
        ? Boolean(parsed.autoplay_videos_on_scroll)
        : true,
    };
  } catch (err) {
    console.warn('Failed to parse user preferences from localStorage:', err);
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

/**
 * Saves user preferences to localStorage and attempts graceful DB sync if table exists
 */
export async function saveUserPreferences(
  updated: Partial<UserPreferences>,
  profileId?: number
): Promise<UserPreferences> {
  if (updated.autoplay_videos_on_scroll !== undefined && typeof window !== 'undefined') {
    try {
      localStorage.setItem('ndc_autoplay_explicitly_set', 'true');
    } catch {}
  }
  const current = getUserPreferences();
  const merged: UserPreferences = {
    ...current,
    ...updated,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(merged));
      // Dispatch custom event for real-time reactivity across components
      window.dispatchEvent(
        new CustomEvent('ndc_user_prefs_changed', { detail: merged })
      );
    } catch (err) {
      console.warn('Failed to save preferences to localStorage:', err);
    }
  }

  // Graceful DB synchronization attempt
  if (isSupabaseConfigured && profileId) {
    try {
      // 1. If public privacy columns exist on alumni_profiles, synchronize them directly
      const profileUpdates: Record<string, any> = {};
      if (updated.is_public !== undefined) {
        profileUpdates.is_public = updated.is_public;
      }
      if (updated.show_contact_to_verified !== undefined) {
        profileUpdates.show_contact_to_verified = updated.show_contact_to_verified;
      }

      if (Object.keys(profileUpdates).length > 0) {
        await supabase
          .from('alumni_profiles')
          .update(profileUpdates)
          .eq('id', profileId);
      }

      // 2. Try persisting full preferences if a user_preferences table is provisioned
      // Fails silently if table does not exist
      await supabase
        .from('user_preferences')
        .upsert(
          {
            profile_id: profileId,
            preferences: merged,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'profile_id' }
        );
    } catch {
      // Harmless: user_preferences table is optional, localStorage fallback is active
    }
  }

  return merged;
}
