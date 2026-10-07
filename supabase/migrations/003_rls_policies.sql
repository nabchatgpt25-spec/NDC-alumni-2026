-- =============================================================================
-- MIGRATION 003: ROW LEVEL SECURITY (RLS) POLICIES, COLUMN GRANTS & PRIVACY
-- Project: Notre Dame College (NDC) Alumni Platform
-- Target: Supabase PostgreSQL
-- Note: Storage policies are intentionally excluded from this migration.
-- =============================================================================

BEGIN;

SET search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ON ALL 18 PRODUCTION TABLES
-- -----------------------------------------------------------------------------
ALTER TABLE public.academic_stream_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_doc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. COLUMN-LEVEL PRIVILEGE SEPARATION & PUBLIC DIRECTORY VIEW
-- PostgreSQL RLS controls rows, not columns. To guarantee that sensitive contact
-- columns (email, phone, whatsapp, fb_link, college_roll) are NEVER exposed
-- through ordinary SELECT queries on `public.alumni_profiles`:
--   1. Revoke table-level SELECT on `public.alumni_profiles` from PUBLIC, anon,
--      and authenticated.
--   2. Grant column-level SELECT to `authenticated` ONLY on non-sensitive columns.
--   3. Sensitive contact fields are read exclusively via the authorized
--      SECURITY DEFINER RPC `public.get_alumni_contact_details(p_profile_id)`.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.alumni_profiles FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  auth_user_id,
  role,
  full_name,
  avatar_url,
  cover_url,
  batch_year,
  session,
  academic_stream,
  academic_group,
  section,
  verification_status,
  verification_method,
  vouches_count,
  vouch_target_count,
  verified_at,
  verified_by_profile_id,
  profession,
  position,
  institution,
  cadre,
  specialty,
  specialty_other,
  degree,
  city,
  country,
  latitude,
  longitude,
  bio,
  career_history,
  badges,
  blood_group,
  is_public,
  show_contact_to_verified,
  posts_count,
  last_seen_at,
  search_vector,
  created_at,
  updated_at
) ON public.alumni_profiles TO authenticated;

GRANT INSERT (
  auth_user_id,
  full_name,
  avatar_url,
  cover_url,
  batch_year,
  session,
  academic_stream,
  academic_group,
  section,
  profession,
  position,
  institution,
  cadre,
  specialty,
  specialty_other,
  degree,
  city,
  country,
  latitude,
  longitude,
  bio,
  career_history,
  blood_group,
  college_roll,
  email,
  phone,
  whatsapp,
  fb_link,
  is_public,
  show_contact_to_verified
) ON public.alumni_profiles TO authenticated;

GRANT UPDATE (
  full_name,
  avatar_url,
  cover_url,
  batch_year,
  session,
  academic_stream,
  academic_group,
  section,
  profession,
  position,
  institution,
  cadre,
  specialty,
  specialty_other,
  degree,
  city,
  country,
  latitude,
  longitude,
  bio,
  career_history,
  blood_group,
  college_roll,
  email,
  phone,
  whatsapp,
  fb_link,
  is_public,
  show_contact_to_verified,
  last_seen_at,
  role,
  verification_status,
  verification_method,
  verified_at,
  verified_by_profile_id,
  badges
) ON public.alumni_profiles TO authenticated;

GRANT DELETE ON public.alumni_profiles TO authenticated;
GRANT ALL ON public.alumni_profiles TO service_role;

-- Secure projection view for public directory queries.
-- Excludes:
--   - sensitive contact fields (email, phone, whatsapp, fb_link, college_roll)
--   - authentication identifiers (auth_user_id)
--   - privileged verification internals (verification_method, vouches_count,
--     vouch_target_count, verified_at, verified_by_profile_id)
--   - internal administrative role (role)
DROP VIEW IF EXISTS public.public_alumni_directory;
CREATE VIEW public.public_alumni_directory
WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  avatar_url,
  cover_url,
  batch_year,
  session,
  academic_stream,
  academic_group,
  section,
  verification_status,
  profession,
  position,
  institution,
  cadre,
  specialty,
  specialty_other,
  degree,
  city,
  country,
  latitude,
  longitude,
  bio,
  career_history,
  badges,
  blood_group,
  is_public,
  posts_count,
  last_seen_at,
  created_at
FROM public.alumni_profiles
WHERE is_public = TRUE;

REVOKE ALL ON public.public_alumni_directory FROM PUBLIC, anon;
GRANT SELECT ON public.public_alumni_directory TO authenticated, service_role;

-- Explicitly lock down audit_logs table privileges at the GRANT level as well
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- Revoke anonymous access from private management tables
REVOKE ALL ON public.notifications FROM PUBLIC, anon;
REVOKE ALL ON public.verification_requests FROM PUBLIC, anon;
REVOKE ALL ON public.peer_vouches FROM PUBLIC, anon;
REVOKE ALL ON public.admin_doc_submissions FROM PUBLIC, anon;
REVOKE ALL ON public.blood_donors FROM PUBLIC, anon;
REVOKE ALL ON public.blood_requests FROM PUBLIC, anon;
REVOKE ALL ON public.blood_request_responses FROM PUBLIC, anon;

-- Explicitly grant privileges for social quad feed tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT SELECT ON public.post_comments TO anon;
GRANT ALL ON public.post_comments TO service_role;

GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT SELECT ON public.post_likes TO anon;
GRANT ALL ON public.post_likes TO service_role;

GRANT SELECT, INSERT, DELETE ON public.saved_posts TO authenticated;
GRANT ALL ON public.saved_posts TO service_role;

-- Restrict anon to read-only on public reference/content tables and insert-only on contact_inquiries
REVOKE ALL ON public.batches FROM PUBLIC, anon;
GRANT SELECT ON public.batches TO anon, authenticated;

REVOKE ALL ON public.gallery_albums FROM PUBLIC, anon;
GRANT SELECT ON public.gallery_albums TO anon, authenticated;

REVOKE ALL ON public.gallery_photos FROM PUBLIC, anon;
GRANT SELECT ON public.gallery_photos TO anon, authenticated;

REVOKE ALL ON public.official_notices FROM PUBLIC, anon;
GRANT SELECT ON public.official_notices TO anon, authenticated;

REVOKE ALL ON public.contact_inquiries FROM PUBLIC, anon;
GRANT INSERT ON public.contact_inquiries TO anon, authenticated;

-- Restrict notifications updates for authenticated users strictly to the `unread` column
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (unread) ON public.notifications TO authenticated;

-- Disallow direct client updates on immutable join/vouch tables
REVOKE UPDATE ON public.post_likes FROM authenticated;
REVOKE UPDATE ON public.saved_posts FROM authenticated;
REVOKE UPDATE ON public.peer_vouches FROM authenticated;

-- -----------------------------------------------------------------------------
-- 3. TABLE-BY-TABLE RLS POLICIES
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 3.0 academic_stream_groups (Readable for registration dropdowns, Admin-writable)
-- =============================================================================
GRANT SELECT ON public.academic_stream_groups TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.academic_stream_groups TO authenticated;
GRANT ALL ON public.academic_stream_groups TO service_role;

DROP POLICY IF EXISTS "academic_stream_groups_select_all" ON public.academic_stream_groups;
CREATE POLICY "academic_stream_groups_select_all"
  ON public.academic_stream_groups FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "academic_stream_groups_insert_admin" ON public.academic_stream_groups;
CREATE POLICY "academic_stream_groups_insert_admin"
  ON public.academic_stream_groups FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "academic_stream_groups_update_admin" ON public.academic_stream_groups;
CREATE POLICY "academic_stream_groups_update_admin"
  ON public.academic_stream_groups FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "academic_stream_groups_delete_admin" ON public.academic_stream_groups;
CREATE POLICY "academic_stream_groups_delete_admin"
  ON public.academic_stream_groups FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 3.1 batches
-- =============================================================================
DROP POLICY IF EXISTS "batches_select_all" ON public.batches;
CREATE POLICY "batches_select_all"
  ON public.batches FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "batches_insert_admin" ON public.batches;
CREATE POLICY "batches_insert_admin"
  ON public.batches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "batches_update_admin" ON public.batches;
CREATE POLICY "batches_update_admin"
  ON public.batches FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "batches_delete_admin" ON public.batches;
CREATE POLICY "batches_delete_admin"
  ON public.batches FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 3.2 alumni_profiles
-- =============================================================================
DROP POLICY IF EXISTS "alumni_profiles_select_authenticated" ON public.alumni_profiles;
CREATE POLICY "alumni_profiles_select_authenticated"
  ON public.alumni_profiles FOR SELECT
  TO authenticated
  USING (
    is_public = TRUE
    OR auth_user_id = auth.uid()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "alumni_profiles_insert_own" ON public.alumni_profiles;
CREATE POLICY "alumni_profiles_insert_own"
  ON public.alumni_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    AND role = 'member'
    AND verification_status = 'unverified'
  );

DROP POLICY IF EXISTS "alumni_profiles_update_own_or_admin" ON public.alumni_profiles;
CREATE POLICY "alumni_profiles_update_own_or_admin"
  ON public.alumni_profiles FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.is_admin_or_mod()
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "alumni_profiles_delete_admin" ON public.alumni_profiles;
CREATE POLICY "alumni_profiles_delete_admin"
  ON public.alumni_profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 3.3 posts
-- =============================================================================
DROP POLICY IF EXISTS "posts_select_visible" ON public.posts;
CREATE POLICY "posts_select_visible"
  ON public.posts FOR SELECT
  TO anon, authenticated
  USING (
    is_deleted = FALSE
    OR author_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
CREATE POLICY "posts_insert_own"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = public.current_profile_id()
    AND is_deleted = FALSE
    AND (is_pinned = FALSE OR public.is_admin_or_mod())
  );

DROP POLICY IF EXISTS "posts_update_own_or_mod" ON public.posts;
CREATE POLICY "posts_update_own_or_mod"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (
    author_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  )
  WITH CHECK (
    author_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "posts_delete_own_or_mod" ON public.posts;
CREATE POLICY "posts_delete_own_or_mod"
  ON public.posts FOR DELETE
  TO authenticated
  USING (
    author_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

-- =============================================================================
-- 3.4 post_comments
-- =============================================================================
DROP POLICY IF EXISTS "post_comments_select_visible" ON public.post_comments;
CREATE POLICY "post_comments_select_visible"
  ON public.post_comments FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    OR user_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "post_comments_insert_own" ON public.post_comments;
CREATE POLICY "post_comments_insert_own"
  ON public.post_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = public.current_profile_id()
    AND is_deleted = FALSE
  );

DROP POLICY IF EXISTS "post_comments_update_own_or_mod" ON public.post_comments;
CREATE POLICY "post_comments_update_own_or_mod"
  ON public.post_comments FOR UPDATE
  TO authenticated
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  )
  WITH CHECK (
    user_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "post_comments_delete_own_or_mod" ON public.post_comments;
CREATE POLICY "post_comments_delete_own_or_mod"
  ON public.post_comments FOR DELETE
  TO authenticated
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin_or_mod()
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_comments.post_id
        AND p.author_id = public.current_profile_id()
    )
  );

-- =============================================================================
-- 3.5 post_likes
-- =============================================================================
DROP POLICY IF EXISTS "post_likes_select_authenticated" ON public.post_likes;
CREATE POLICY "post_likes_select_authenticated"
  ON public.post_likes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "post_likes_insert_own" ON public.post_likes;
CREATE POLICY "post_likes_insert_own"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.current_profile_id());

DROP POLICY IF EXISTS "post_likes_delete_own" ON public.post_likes;
CREATE POLICY "post_likes_delete_own"
  ON public.post_likes FOR DELETE
  TO authenticated
  USING (user_id = public.current_profile_id());

-- =============================================================================
-- 3.6 saved_posts (Strictly private per user)
-- =============================================================================
DROP POLICY IF EXISTS "saved_posts_select_own" ON public.saved_posts;
CREATE POLICY "saved_posts_select_own"
  ON public.saved_posts FOR SELECT
  TO authenticated
  USING (user_id = public.current_profile_id());

DROP POLICY IF EXISTS "saved_posts_insert_own" ON public.saved_posts;
CREATE POLICY "saved_posts_insert_own"
  ON public.saved_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.current_profile_id());

DROP POLICY IF EXISTS "saved_posts_delete_own" ON public.saved_posts;
CREATE POLICY "saved_posts_delete_own"
  ON public.saved_posts FOR DELETE
  TO authenticated
  USING (user_id = public.current_profile_id());

-- =============================================================================
-- 3.7 notifications (Strictly private to recipient)
-- =============================================================================
DROP POLICY IF EXISTS "notifications_select_recipient" ON public.notifications;
CREATE POLICY "notifications_select_recipient"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_id = public.current_profile_id());

DROP POLICY IF EXISTS "notifications_insert_admin_only" ON public.notifications;
CREATE POLICY "notifications_insert_admin_only"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_mod());

DROP POLICY IF EXISTS "notifications_update_recipient_read_state" ON public.notifications;
CREATE POLICY "notifications_update_recipient_read_state"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = public.current_profile_id())
  WITH CHECK (recipient_id = public.current_profile_id());

DROP POLICY IF EXISTS "notifications_delete_recipient_or_admin" ON public.notifications;
CREATE POLICY "notifications_delete_recipient_or_admin"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (
    recipient_id = public.current_profile_id()
    OR public.is_admin()
  );

-- =============================================================================
-- 3.8 verification_requests
-- =============================================================================
DROP POLICY IF EXISTS "verification_requests_select_authorized" ON public.verification_requests;
CREATE POLICY "verification_requests_select_authorized"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING (
    requester_id = public.current_profile_id()
    OR public.is_admin_or_mod()
    OR (
      public.is_verified_alumnus()
      AND batch_year = public.current_user_batch_year()
    )
  );

DROP POLICY IF EXISTS "verification_requests_insert_own" ON public.verification_requests;
CREATE POLICY "verification_requests_insert_own"
  ON public.verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = public.current_profile_id()
    AND status = 'pending'
    AND current_vouches = 0
    AND NOT public.is_verified_alumnus()
  );

DROP POLICY IF EXISTS "verification_requests_update_mod_no_self_approve" ON public.verification_requests;
CREATE POLICY "verification_requests_update_mod_no_self_approve"
  ON public.verification_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_mod()
    AND requester_id <> public.current_profile_id()
  )
  WITH CHECK (
    public.is_admin_or_mod()
    AND requester_id <> public.current_profile_id()
  );

DROP POLICY IF EXISTS "verification_requests_delete_own_pending_or_admin" ON public.verification_requests;
CREATE POLICY "verification_requests_delete_own_pending_or_admin"
  ON public.verification_requests FOR DELETE
  TO authenticated
  USING (
    (requester_id = public.current_profile_id() AND status = 'pending')
    OR public.is_admin()
  );

-- =============================================================================
-- 3.9 peer_vouches
-- =============================================================================
DROP POLICY IF EXISTS "peer_vouches_select_authorized" ON public.peer_vouches;
CREATE POLICY "peer_vouches_select_authorized"
  ON public.peer_vouches FOR SELECT
  TO authenticated
  USING (
    requester_id = public.current_profile_id()
    OR voucher_id = public.current_profile_id()
    OR public.is_admin_or_mod()
    OR (
      public.is_verified_alumnus()
      AND voucher_batch = public.current_user_batch_year()
    )
  );

DROP POLICY IF EXISTS "peer_vouches_insert_verified_peer" ON public.peer_vouches;
CREATE POLICY "peer_vouches_insert_verified_peer"
  ON public.peer_vouches FOR INSERT
  TO authenticated
  WITH CHECK (
    voucher_id = public.current_profile_id()
    AND voucher_id <> requester_id
    AND public.is_verified_alumnus()
  );

DROP POLICY IF EXISTS "peer_vouches_delete_admin" ON public.peer_vouches;
CREATE POLICY "peer_vouches_delete_admin"
  ON public.peer_vouches FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 3.10 admin_doc_submissions (Confidential verification documents)
-- =============================================================================
DROP POLICY IF EXISTS "admin_doc_submissions_select_owner_or_mod" ON public.admin_doc_submissions;
CREATE POLICY "admin_doc_submissions_select_owner_or_mod"
  ON public.admin_doc_submissions FOR SELECT
  TO authenticated
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "admin_doc_submissions_insert_owner" ON public.admin_doc_submissions;
CREATE POLICY "admin_doc_submissions_insert_owner"
  ON public.admin_doc_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = public.current_profile_id()
    AND status = 'pending'
    AND reviewed_by IS NULL
  );

DROP POLICY IF EXISTS "admin_doc_submissions_update_mod_no_self_approve" ON public.admin_doc_submissions;
CREATE POLICY "admin_doc_submissions_update_mod_no_self_approve"
  ON public.admin_doc_submissions FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_mod()
    AND user_id <> public.current_profile_id()
  )
  WITH CHECK (
    public.is_admin_or_mod()
    AND user_id <> public.current_profile_id()
  );

DROP POLICY IF EXISTS "admin_doc_submissions_delete_admin" ON public.admin_doc_submissions;
CREATE POLICY "admin_doc_submissions_delete_admin"
  ON public.admin_doc_submissions FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 3.11 blood_donors
-- =============================================================================
DROP POLICY IF EXISTS "blood_donors_select_authenticated" ON public.blood_donors;
CREATE POLICY "blood_donors_select_authenticated"
  ON public.blood_donors FOR SELECT
  TO authenticated
  USING (
    is_registered_donor = TRUE
    OR user_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "blood_donors_insert_own" ON public.blood_donors;
CREATE POLICY "blood_donors_insert_own"
  ON public.blood_donors FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.current_profile_id());

DROP POLICY IF EXISTS "blood_donors_update_own_or_admin" ON public.blood_donors;
CREATE POLICY "blood_donors_update_own_or_admin"
  ON public.blood_donors FOR UPDATE
  TO authenticated
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "blood_donors_delete_own_or_admin" ON public.blood_donors;
CREATE POLICY "blood_donors_delete_own_or_admin"
  ON public.blood_donors FOR DELETE
  TO authenticated
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin()
  );

-- =============================================================================
-- 3.12 blood_requests
-- =============================================================================
DROP POLICY IF EXISTS "blood_requests_select_authenticated" ON public.blood_requests;
CREATE POLICY "blood_requests_select_authenticated"
  ON public.blood_requests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "blood_requests_insert_own" ON public.blood_requests;
CREATE POLICY "blood_requests_insert_own"
  ON public.blood_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = public.current_profile_id());

DROP POLICY IF EXISTS "blood_requests_update_requester_or_mod" ON public.blood_requests;
CREATE POLICY "blood_requests_update_requester_or_mod"
  ON public.blood_requests FOR UPDATE
  TO authenticated
  USING (
    requester_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  )
  WITH CHECK (
    requester_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "blood_requests_delete_requester_or_mod" ON public.blood_requests;
CREATE POLICY "blood_requests_delete_requester_or_mod"
  ON public.blood_requests FOR DELETE
  TO authenticated
  USING (
    requester_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

-- =============================================================================
-- 3.13 blood_request_responses
-- =============================================================================
DROP POLICY IF EXISTS "blood_responses_select_authenticated" ON public.blood_request_responses;
CREATE POLICY "blood_responses_select_authenticated"
  ON public.blood_request_responses FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "blood_responses_insert_own" ON public.blood_request_responses;
CREATE POLICY "blood_responses_insert_own"
  ON public.blood_request_responses FOR INSERT
  TO authenticated
  WITH CHECK (donor_user_id = public.current_profile_id());

DROP POLICY IF EXISTS "blood_responses_update_donor_requester_or_mod" ON public.blood_request_responses;
CREATE POLICY "blood_responses_update_donor_requester_or_mod"
  ON public.blood_request_responses FOR UPDATE
  TO authenticated
  USING (
    donor_user_id = public.current_profile_id()
    OR public.is_admin_or_mod()
    OR EXISTS (
      SELECT 1 FROM public.blood_requests br
      WHERE br.id = blood_request_responses.request_id
        AND br.requester_id = public.current_profile_id()
    )
  )
  WITH CHECK (
    donor_user_id = public.current_profile_id()
    OR public.is_admin_or_mod()
    OR EXISTS (
      SELECT 1 FROM public.blood_requests br
      WHERE br.id = blood_request_responses.request_id
        AND br.requester_id = public.current_profile_id()
    )
  );

DROP POLICY IF EXISTS "blood_responses_delete_donor_or_admin" ON public.blood_request_responses;
CREATE POLICY "blood_responses_delete_donor_or_admin"
  ON public.blood_request_responses FOR DELETE
  TO authenticated
  USING (
    donor_user_id = public.current_profile_id()
    OR public.is_admin()
  );

-- =============================================================================
-- 3.14 gallery_albums
-- Separate anon and authenticated SELECT policies so anon never calls
-- SECURITY DEFINER helper functions.
-- =============================================================================
DROP POLICY IF EXISTS "gallery_albums_select_published" ON public.gallery_albums;
DROP POLICY IF EXISTS "gallery_albums_select_anon" ON public.gallery_albums;
CREATE POLICY "gallery_albums_select_anon"
  ON public.gallery_albums FOR SELECT
  TO anon
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "gallery_albums_select_authenticated" ON public.gallery_albums;
CREATE POLICY "gallery_albums_select_authenticated"
  ON public.gallery_albums FOR SELECT
  TO authenticated
  USING (
    is_published = TRUE
    OR created_by_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "gallery_albums_insert_verified_or_mod" ON public.gallery_albums;
CREATE POLICY "gallery_albums_insert_verified_or_mod"
  ON public.gallery_albums FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_id = public.current_profile_id()
    AND (public.is_verified_alumnus() OR public.is_admin_or_mod())
  );

DROP POLICY IF EXISTS "gallery_albums_update_creator_or_mod" ON public.gallery_albums;
CREATE POLICY "gallery_albums_update_creator_or_mod"
  ON public.gallery_albums FOR UPDATE
  TO authenticated
  USING (
    created_by_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  )
  WITH CHECK (
    created_by_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "gallery_albums_delete_mod" ON public.gallery_albums;
CREATE POLICY "gallery_albums_delete_mod"
  ON public.gallery_albums FOR DELETE
  TO authenticated
  USING (public.is_admin_or_mod());

-- =============================================================================
-- 3.15 gallery_photos
-- =============================================================================
DROP POLICY IF EXISTS "gallery_photos_select_approved" ON public.gallery_photos;
DROP POLICY IF EXISTS "gallery_photos_select_anon" ON public.gallery_photos;
CREATE POLICY "gallery_photos_select_anon"
  ON public.gallery_photos FOR SELECT
  TO anon
  USING (is_approved = TRUE);

DROP POLICY IF EXISTS "gallery_photos_select_authenticated" ON public.gallery_photos;
CREATE POLICY "gallery_photos_select_authenticated"
  ON public.gallery_photos FOR SELECT
  TO authenticated
  USING (
    is_approved = TRUE
    OR uploader_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "gallery_photos_insert_own" ON public.gallery_photos;
CREATE POLICY "gallery_photos_insert_own"
  ON public.gallery_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    uploader_id = public.current_profile_id()
    AND (public.is_verified_alumnus() OR public.is_admin_or_mod())
  );

DROP POLICY IF EXISTS "gallery_photos_update_uploader_or_mod" ON public.gallery_photos;
CREATE POLICY "gallery_photos_update_uploader_or_mod"
  ON public.gallery_photos FOR UPDATE
  TO authenticated
  USING (
    uploader_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  )
  WITH CHECK (
    uploader_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "gallery_photos_delete_uploader_or_mod" ON public.gallery_photos;
CREATE POLICY "gallery_photos_delete_uploader_or_mod"
  ON public.gallery_photos FOR DELETE
  TO authenticated
  USING (
    uploader_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

-- =============================================================================
-- 3.16 official_notices
-- =============================================================================
DROP POLICY IF EXISTS "official_notices_select_published" ON public.official_notices;
DROP POLICY IF EXISTS "official_notices_select_anon" ON public.official_notices;
CREATE POLICY "official_notices_select_anon"
  ON public.official_notices FOR SELECT
  TO anon
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "official_notices_select_authenticated" ON public.official_notices;
CREATE POLICY "official_notices_select_authenticated"
  ON public.official_notices FOR SELECT
  TO authenticated
  USING (
    is_published = TRUE
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "official_notices_insert_admin" ON public.official_notices;
CREATE POLICY "official_notices_insert_admin"
  ON public.official_notices FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "official_notices_update_admin" ON public.official_notices;
CREATE POLICY "official_notices_update_admin"
  ON public.official_notices FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "official_notices_delete_admin" ON public.official_notices;
CREATE POLICY "official_notices_delete_admin"
  ON public.official_notices FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 3.17 contact_inquiries
-- =============================================================================
DROP POLICY IF EXISTS "contact_inquiries_select_own_or_mod" ON public.contact_inquiries;
CREATE POLICY "contact_inquiries_select_own_or_mod"
  ON public.contact_inquiries FOR SELECT
  TO authenticated
  USING (
    sender_profile_id = public.current_profile_id()
    OR public.is_admin_or_mod()
  );

DROP POLICY IF EXISTS "contact_inquiries_insert_anyone" ON public.contact_inquiries;
DROP POLICY IF EXISTS "contact_inquiries_insert_anon" ON public.contact_inquiries;
CREATE POLICY "contact_inquiries_insert_anon"
  ON public.contact_inquiries FOR INSERT
  TO anon
  WITH CHECK (
    status = 'new'
    AND handled_by IS NULL
    AND admin_notes IS NULL
    AND sender_profile_id IS NULL
  );

DROP POLICY IF EXISTS "contact_inquiries_insert_authenticated" ON public.contact_inquiries;
CREATE POLICY "contact_inquiries_insert_authenticated"
  ON public.contact_inquiries FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'new'
    AND handled_by IS NULL
    AND admin_notes IS NULL
    AND (
      sender_profile_id IS NULL
      OR sender_profile_id = public.current_profile_id()
    )
  );

DROP POLICY IF EXISTS "contact_inquiries_update_mod" ON public.contact_inquiries;
CREATE POLICY "contact_inquiries_update_mod"
  ON public.contact_inquiries FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_mod())
  WITH CHECK (public.is_admin_or_mod());

DROP POLICY IF EXISTS "contact_inquiries_delete_admin" ON public.contact_inquiries;
CREATE POLICY "contact_inquiries_delete_admin"
  ON public.contact_inquiries FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 3.18 audit_logs (Immutable, append-only via SECURITY DEFINER triggers)
-- =============================================================================
DROP POLICY IF EXISTS "audit_logs_select_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin_only"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- No INSERT, UPDATE, or DELETE policies for client roles on audit_logs.

COMMIT;
