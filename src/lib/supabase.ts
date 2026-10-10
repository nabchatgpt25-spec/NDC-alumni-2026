import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://gqbibeffpbvpopgmmqvr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYmliZWZmcGJ2cG9wZ21tcXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMDQxMzQsImV4cCI6MjEwNjg4MDEzNH0.9G5VKEBVp-yGfx_uAhmt4uARKQPUH9-6qYVT2WJmOzE';

const rawUrlInput =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_SUPABASE_URL;
const rawAnonKeyInput =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || DEFAULT_SUPABASE_ANON_KEY;

// Sanitize URL: ensure it is strictly the root host (e.g. https://xyz.supabase.co), without /rest/v1 or /auth/v1 suffixes
const sanitizeSupabaseUrl = (url: string): string => {
  if (!url || !url.startsWith('http')) return DEFAULT_SUPABASE_URL;
  return url
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/auth\/v1\/?$/, '')
    .replace(/\/+$/, '');
};

// Sanitize Anon Key: a valid Supabase anon key must be a 3-part JWT token (header.payload.signature), not an HTTP url or empty
const sanitizeSupabaseAnonKey = (key: string): string => {
  if (!key || key.startsWith('http') || key.split('.').length !== 3) {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  return key;
};

const sanitizedUrl = sanitizeSupabaseUrl(rawUrlInput);
const sanitizedAnonKey = sanitizeSupabaseAnonKey(rawAnonKeyInput);

export const isSupabaseConfigured = Boolean(
  sanitizedUrl &&
  sanitizedAnonKey &&
  sanitizedUrl.startsWith('http') &&
  !sanitizedUrl.includes('placeholder.supabase.co')
);

// Never use or expose service_role key in client code.
const effectiveUrl = isSupabaseConfigured ? sanitizedUrl : DEFAULT_SUPABASE_URL;
const effectiveAnonKey = isSupabaseConfigured ? sanitizedAnonKey : DEFAULT_SUPABASE_ANON_KEY;

export const SUPABASE_API_URL = effectiveUrl;
export const SUPABASE_API_ANON_KEY = effectiveAnonKey;

export const supabase: SupabaseClient = createClient(effectiveUrl, effectiveAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Explicit non-sensitive column list granted to `authenticated` on `public.alumni_profiles`
 * in Migration 003.
 *
 * IMPORTANT: Never run `.select('*')` on `public.alumni_profiles` because column-level
 * SELECT on (email, phone, whatsapp, fb_link, college_roll) is revoked from `authenticated`.
 * Sensitive contact columns must be fetched via `supabase.rpc('get_alumni_contact_details', { p_profile_id })`.
 */
export const ALUMNI_PUBLIC_COLUMNS = [
  'id',
  'auth_user_id',
  'role',
  'full_name',
  'avatar_url',
  'cover_url',
  'batch_year',
  'session',
  'academic_stream',
  'academic_group',
  'section',
  'verification_status',
  'verification_method',
  'vouches_count',
  'vouch_target_count',
  'verified_at',
  'verified_by_profile_id',
  'profession',
  'position',
  'institution',
  'cadre',
  'specialty',
  'specialty_other',
  'degree',
  'city',
  'country',
  'latitude',
  'longitude',
  'bio',
  'career_history',
  'badges',
  'blood_group',
  'is_public',
  'show_contact_to_verified',
  'posts_count',
  'last_seen_at',
  'created_at',
  'updated_at',
].join(', ');
