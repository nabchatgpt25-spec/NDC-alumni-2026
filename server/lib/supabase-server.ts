import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseKey = (
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder.supabase.co')
);

// Safe fallback client for server-side execution so imports never fail at startup
const effectiveUrl = isSupabaseServerConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const effectiveKey = isSupabaseServerConfigured ? supabaseKey : 'public-anon-placeholder-key';

export const supabaseServer: SupabaseClient = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Reconciled Supabase Table Name Constants
 * Matches the source-of-truth schema in /supabase/migrations/001_core_schema.sql
 */
export const SUPABASE_TABLES = {
  ALUMNI_PROFILES: 'alumni_profiles',
  BATCHES: 'batches',
  ACADEMIC_STREAM_GROUPS: 'academic_stream_groups',
  POSTS: 'posts',
  POST_COMMENTS: 'post_comments',
  POST_LIKES: 'post_likes',
  SAVED_POSTS: 'saved_posts', // Reconciled: saved_posts (not post_saves)
  VERIFICATION_REQUESTS: 'verification_requests', // Reconciled: verification_requests (not verification_submissions)
  ADMIN_DOC_SUBMISSIONS: 'admin_doc_submissions',
  PEER_VOUCHES: 'peer_vouches',
  BLOOD_DONORS: 'blood_donors', // Reconciled: blood_donors (not blood_donor_registrations)
  BLOOD_REQUESTS: 'blood_requests', // Reconciled: blood_requests (not blood_emergency_requests)
  BLOOD_REQUEST_RESPONSES: 'blood_request_responses', // Reconciled: blood_request_responses (not blood_donation_responses)
  NOTIFICATIONS: 'notifications',
  GALLERY_ALBUMS: 'gallery_albums',
  GALLERY_PHOTOS: 'gallery_photos',
  OFFICIAL_NOTICES: 'official_notices',
  CONTACT_INQUIRIES: 'contact_inquiries',
  AUDIT_LOGS: 'audit_logs', // Reconciled: audit_logs (not security_audit_logs)
} as const;
