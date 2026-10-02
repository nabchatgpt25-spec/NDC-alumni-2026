import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('placeholder.supabase.co')
);

// Safe fallback URL/key so createClient never throws at module import time when env vars are not yet set.
// Never use or expose service_role key in client code.
const effectiveUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const effectiveAnonKey = isSupabaseConfigured ? rawAnonKey : 'public-anon-placeholder-key';

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
