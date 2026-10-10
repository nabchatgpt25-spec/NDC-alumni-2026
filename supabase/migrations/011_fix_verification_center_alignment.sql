-- =============================================================================
-- MIGRATION 011: Align Verification Center with Live Database & Edge Functions (Hardened)
-- Project: Notre Dame College (NDC) Alumni Network
-- Description:
--   1. Adds administrative review notes & ID submission status columns to alumni_profiles.
--   2. Updates protect_privileged_profile_columns to prevent ordinary users from modifying
--      id_submission_status or admin_review_note.
--   3. Restricts peer_vouches and verification_requests RLS to minimum necessary access.
--   4. Provides privacy-preserving RPC to resolve active peer vouch requests without
--      exposing sensitive PII (email, phone, roll, or private ID uploads).
--   5. Hardens the admin document review trigger:
--      - Binds authenticated admin identity securely.
--      - Strictly prevents admin self-approval under all execution contexts (including service_role).
--      - Prevents duplicate reviews and repeated notifications.
--      - Safely handles NULL badges.
--      - Strictly enforces notification table constraints (length <= 1500, valid enums).
--      - Atomically synchronizes alumni profile status, badges, requests, and audit logs.
-- =============================================================================

BEGIN;

SET search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- 1. ADD VERIFICATION REVIEW COLUMNS TO ALUMNI_PROFILES
-- -----------------------------------------------------------------------------
ALTER TABLE public.alumni_profiles
  ADD COLUMN IF NOT EXISTS admin_review_note TEXT NULL,
  ADD COLUMN IF NOT EXISTS id_submission_status VARCHAR(32) NOT NULL DEFAULT 'none'
    CHECK (id_submission_status IN ('none', 'pending', 'approved', 'rejected'));

-- -----------------------------------------------------------------------------
-- 2. HARDEN PRIVILEGED PROFILE COLUMN PROTECTION TRIGGER
-- Prevents ordinary users from tampering with id_submission_status or admin_review_note.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_internal_or_service_role() THEN
      IF auth.uid() IS NULL OR NEW.auth_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: auth_user_id must match authenticated session.';
      END IF;
    END IF;

    -- Force server-controlled defaults for non-privileged insertions
    IF NOT public.is_internal_or_service_role() THEN
      NEW.role := 'member';
      NEW.verification_status := 'unverified';
      NEW.verification_method := NULL;
      NEW.id_submission_status := 'none';
      NEW.admin_review_note := NULL;
      NEW.vouches_count := 0;
      NEW.vouch_target_count := 2;
      NEW.verified_at := NULL;
      NEW.verified_by_profile_id := NULL;
      NEW.badges := '{}'::TEXT[];
      NEW.posts_count := 0;
      NEW.created_at := now();
      NEW.updated_at := now();
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'Identity columns (id, auth_user_id) cannot be modified.';
    END IF;
    NEW.created_at := OLD.created_at;

    IF NEW.posts_count IS DISTINCT FROM OLD.posts_count THEN
      RAISE EXCEPTION 'Unauthorized: posts_count is server-controlled.';
    END IF;
    IF NEW.vouches_count IS DISTINCT FROM OLD.vouches_count THEN
      RAISE EXCEPTION 'Unauthorized: vouches_count is server-controlled.';
    END IF;

    -- Only administrators can modify roles
    IF NOT public.is_admin() AND NOT public.is_internal_or_service_role() THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
      END IF;
    END IF;

    -- Prevent self-promotion or self-verification modifications
    IF OLD.auth_user_id = auth.uid() AND NOT public.is_internal_or_service_role() THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Unauthorized: You cannot change your own role.';
      END IF;
      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.verification_method IS DISTINCT FROM OLD.verification_method
         OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
         OR NEW.verified_by_profile_id IS DISTINCT FROM OLD.verified_by_profile_id
         OR NEW.id_submission_status IS DISTINCT FROM OLD.id_submission_status
         OR NEW.admin_review_note IS DISTINCT FROM OLD.admin_review_note
      THEN
        RAISE EXCEPTION 'Unauthorized: You cannot modify or approve your own verification status.';
      END IF;
    END IF;

    -- Non-admins and non-internal contexts cannot modify verification or badge fields
    IF NOT public.is_internal_or_service_role() AND NOT public.is_admin_or_mod() THEN
      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.verification_method IS DISTINCT FROM OLD.verification_method
         OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
         OR NEW.verified_by_profile_id IS DISTINCT FROM OLD.verified_by_profile_id
         OR NEW.vouch_target_count IS DISTINCT FROM OLD.vouch_target_count
         OR NEW.badges IS DISTINCT FROM OLD.badges
         OR NEW.id_submission_status IS DISTINCT FROM OLD.id_submission_status
         OR NEW.admin_review_note IS DISTINCT FROM OLD.admin_review_note
      THEN
        RAISE EXCEPTION 'Unauthorized: Verification status and badges are server-controlled.';
      END IF;
    END IF;

    -- Audit log for role updates
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      PERFORM public.write_audit_log(
        'PROFILE_ROLE_UPDATED',
        'alumni_profiles',
        NEW.id::TEXT,
        jsonb_build_object('role', OLD.role),
        jsonb_build_object('role', NEW.role),
        'Administrative role update'
      );
    END IF;

    -- Audit log for verification updates
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      IF NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN
        NEW.verified_at := coalesce(NEW.verified_at, now());
        NEW.verified_by_profile_id := coalesce(NEW.verified_by_profile_id, public.current_profile_id());
        NEW.verification_method := coalesce(NEW.verification_method, 'admin_verified');
        NEW.badges := CASE
          WHEN NEW.badges IS NULL OR array_length(NEW.badges, 1) IS NULL THEN
            ARRAY['Verified Notredamian']::TEXT[]
          WHEN NOT ('Verified Notredamian' = ANY(NEW.badges)) THEN
            array_append(NEW.badges, 'Verified Notredamian')
          ELSE
            NEW.badges
        END;
      END IF;

      PERFORM public.write_audit_log(
        'PROFILE_VERIFICATION_UPDATED',
        'alumni_profiles',
        NEW.id::TEXT,
        jsonb_build_object('verification_status', OLD.verification_status, 'verification_method', OLD.verification_method),
        jsonb_build_object('verification_status', NEW.verification_status, 'verification_method', NEW.verification_method),
        'Administrative verification update'
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_privileged_profile_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_privileged_profile_columns() TO service_role;

-- -----------------------------------------------------------------------------
-- 3. UPDATE RLS ON PUBLIC.VERIFICATION_REQUESTS
-- Verified alumni across all batches can view pending requests for shared vouch links.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "verification_requests_select_authorized" ON public.verification_requests;
CREATE POLICY "verification_requests_select_authorized"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING (
    requester_id = public.current_profile_id()
    OR public.is_admin_or_mod()
    OR (
      public.is_verified_alumnus()
      AND (
        batch_year = public.current_user_batch_year()
        OR status = 'pending'
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 4. UPDATE RLS ON PUBLIC.PEER_VOUCHES (MINIMUM NECESSARY ACCESS)
-- Verified alumni can see vouches on requests from their batch OR currently active
-- pending requests they are evaluating to vouch for.
-- -----------------------------------------------------------------------------
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
      AND (
        voucher_batch = public.current_user_batch_year()
        OR EXISTS (
          SELECT 1 FROM public.verification_requests vr
          WHERE vr.id = peer_vouches.verification_request_id
            AND vr.status = 'pending'
        )
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 5. SECURE PRIVACY-PRESERVING RPC: RESOLVE ACTIVE VOUCH REQUEST BY PROFILE
-- Exposes ONLY display-safe fields. Never returns sensitive PII (email, phone, roll, ID docs).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_vouch_request_by_profile(
  p_profile_id BIGINT
)
RETURNS TABLE (
  request_id UUID,
  requester_id BIGINT,
  requester_name TEXT,
  requester_avatar TEXT,
  batch_year SMALLINT,
  academic_stream public.academic_stream_type,
  academic_group VARCHAR(32),
  section VARCHAR(32),
  message TEXT,
  status public.request_review_status,
  target_vouches SMALLINT,
  current_vouches SMALLINT,
  created_at TIMESTAMPTZ,
  has_caller_vouched BOOLEAN,
  is_caller_self BOOLEAN,
  caller_can_vouch BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_profile_id BIGINT;
  v_caller_verified BOOLEAN := FALSE;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN;
  END IF;

  v_caller_profile_id := public.current_profile_id();

  IF v_caller_profile_id IS NOT NULL THEN
    SELECT (verification_status = 'verified')
    INTO v_caller_verified
    FROM public.alumni_profiles
    WHERE id = v_caller_profile_id;
  END IF;

  RETURN QUERY
  SELECT 
    vr.id AS request_id,
    vr.requester_id,
    p.full_name AS requester_name,
    p.avatar_url AS requester_avatar,
    vr.batch_year,
    vr.academic_stream,
    vr.academic_group,
    vr.section,
    vr.message,
    vr.status,
    vr.target_vouches,
    vr.current_vouches,
    vr.created_at,
    (v_caller_profile_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.peer_vouches pv 
      WHERE pv.verification_request_id = vr.id 
        AND pv.voucher_id = v_caller_profile_id
    )) AS has_caller_vouched,
    (v_caller_profile_id IS NOT NULL AND v_caller_profile_id = vr.requester_id) AS is_caller_self,
    (v_caller_verified IS TRUE AND v_caller_profile_id IS DISTINCT FROM vr.requester_id) AS caller_can_vouch
  FROM public.verification_requests vr
  JOIN public.alumni_profiles p ON p.id = vr.requester_id
  WHERE vr.requester_id = p_profile_id
    AND vr.status = 'pending'
  ORDER BY vr.created_at DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_vouch_request_by_profile(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_vouch_request_by_profile(BIGINT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. HARDENED ADMIN DOCUMENT SUBMISSION TRIGGER
-- Handles both INSERT (applicant submission) and UPDATE (admin review).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_admin_doc_submission_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_reviewer_id BIGINT;
  v_applicant_id BIGINT;
  v_app_batch SMALLINT;
  v_app_roll VARCHAR(32);
  v_app_stream public.academic_stream_type;
  v_app_group VARCHAR(32);
  v_reviewer_role public.user_role;
BEGIN
  -- ---------------------------------------------------------------------------
  -- TG_OP = INSERT: Creation of a new document submission
  -- ---------------------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      -- Authenticated direct user submission: Resolve profile securely from session
      SELECT id, batch_year, college_roll, academic_stream, academic_group
      INTO v_applicant_id, v_app_batch, v_app_roll, v_app_stream, v_app_group
      FROM public.alumni_profiles
      WHERE auth_user_id = auth.uid();

      IF v_applicant_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated alumni profile not found. Please complete profile setup before submitting documents.';
      END IF;

      NEW.user_id := v_applicant_id;
    ELSIF public.is_internal_or_service_role() THEN
      -- Service role / administrative insertion
      IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'user_id is required for document submission.';
      END IF;

      SELECT id, batch_year, college_roll, academic_stream, academic_group
      INTO v_applicant_id, v_app_batch, v_app_roll, v_app_stream, v_app_group
      FROM public.alumni_profiles
      WHERE id = NEW.user_id;

      IF v_applicant_id IS NULL THEN
        RAISE EXCEPTION 'Target alumni profile does not exist.';
      END IF;
    ELSE
      RAISE EXCEPTION 'Authentication required: User must be signed in to submit verification documents.';
    END IF;

    -- Ensure applicant metadata is populated from verified profile records
    NEW.batch_year := coalesce(NEW.batch_year, v_app_batch);
    NEW.college_roll := coalesce(NEW.college_roll, v_app_roll);
    NEW.academic_stream := coalesce(NEW.academic_stream, v_app_stream);
    NEW.academic_group := coalesce(NEW.academic_group, v_app_group);

    -- Strict initial submission state (Never allow client-provided approval on insert)
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.admin_note := NULL;
    NEW.submitted_at := now();
    NEW.updated_at := now();

    -- Atomically update applicant profile id_submission_status to pending
    PERFORM set_config('app.internal_trigger', 'true', true);
    UPDATE public.alumni_profiles
    SET id_submission_status = 'pending',
        admin_review_note = NULL,
        updated_at = now()
    WHERE id = NEW.user_id;
    PERFORM set_config('app.internal_trigger', 'false', true);

    RETURN NEW;
  END IF;

  -- ---------------------------------------------------------------------------
  -- TG_OP = UPDATE: Administrative review of submitted document
  -- ---------------------------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN
    -- Protect immutable document submission attributes
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.batch_year := OLD.batch_year;
    NEW.college_roll := OLD.college_roll;
    NEW.academic_stream := OLD.academic_stream;
    NEW.academic_group := OLD.academic_group;
    NEW.doc_type := OLD.doc_type;
    NEW.doc_type_label := OLD.doc_type_label;
    NEW.storage_object_path := OLD.storage_object_path;
    NEW.submitted_at := OLD.submitted_at;
    NEW.updated_at := now();

    -- Prevent duplicate reviews and repeated approval notifications
    IF NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;

    IF OLD.status = 'approved' THEN
      RAISE EXCEPTION 'This document submission has already been approved and finalized.';
    END IF;

    -- Determine and strictly validate reviewer identity
    IF auth.uid() IS NOT NULL THEN
      -- Direct authenticated client call: MUST be an authorized admin/mod
      SELECT id, role
      INTO v_reviewer_id, v_reviewer_role
      FROM public.alumni_profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'moderator');

      IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Only authorized administrators or moderators can review verification documents.';
      END IF;

      -- Always bind the actual authenticated admin profile ID (never trust client input)
      NEW.reviewed_by := v_reviewer_id;
    ELSIF public.is_internal_or_service_role() THEN
      -- Service role execution (e.g. via admin-hub Edge Function)
      IF NEW.reviewed_by IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: A valid administrator profile ID must be specified in reviewed_by.';
      END IF;

      SELECT id, role
      INTO v_reviewer_id, v_reviewer_role
      FROM public.alumni_profiles
      WHERE id = NEW.reviewed_by
        AND role IN ('admin', 'moderator');

      IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: The specified reviewer is not an authorized administrator or moderator.';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unauthorized: Administrative authentication required to review documents.';
    END IF;

    -- CRITICAL ENFORCEMENT: Never allow self-approval under ANY context (including service_role)
    IF v_reviewer_id = OLD.user_id OR NEW.reviewed_by = OLD.user_id THEN
      RAISE EXCEPTION 'Unauthorized: Administrators cannot review or approve their own verification submissions.';
    END IF;

    NEW.reviewed_by := v_reviewer_id;
    NEW.reviewed_at := now();

    -- -------------------------------------------------------------------------
    -- Status Transition: APPROVED
    -- -------------------------------------------------------------------------
    IF NEW.status = 'approved' THEN
      PERFORM set_config('app.internal_trigger', 'true', true);

      -- 1. Atomically promote applicant profile to verified with badges (NULL-safe)
      UPDATE public.alumni_profiles
      SET verification_status = 'verified',
          verification_method = CASE
            WHEN NEW.doc_type = 'souvenir' THEN 'souvenir_photo'::public.verification_method
            ELSE 'id_card_upload'::public.verification_method
          END,
          id_submission_status = 'approved',
          admin_review_note = NEW.admin_note,
          verified_at = now(),
          verified_by_profile_id = v_reviewer_id,
          badges = CASE
            WHEN badges IS NULL OR array_length(badges, 1) IS NULL THEN
              ARRAY['Verified Notredamian']::TEXT[]
            WHEN NOT ('Verified Notredamian' = ANY(badges)) THEN
              array_append(badges, 'Verified Notredamian')
            ELSE
              badges
          END,
          updated_at = now()
      WHERE id = NEW.user_id;

      -- 2. Atomically resolve any active pending peer verification request for this user
      UPDATE public.verification_requests
      SET status = 'verified',
          reviewed_by = v_reviewer_id,
          reviewed_at = now(),
          admin_note = coalesce(NEW.admin_note, 'Approved by admin via ID document verification'),
          updated_at = now()
      WHERE requester_id = NEW.user_id
        AND status = 'pending';

      PERFORM set_config('app.internal_trigger', 'false', true);

      -- 3. Insert notification to applicant (validated against table constraints)
      INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        title,
        message,
        target_route
      ) VALUES (
        NEW.user_id,
        v_reviewer_id,
        'verification'::public.notification_type,
        'Document Verification Approved',
        substring(coalesce(
          'Your submitted NDC verification document (' || NEW.doc_type_label || ') has been approved by the Alumni Secretariat.',
          'Your submitted NDC verification document has been approved by the Alumni Secretariat.'
        ) from 1 for 1500),
        'profile'
      );

    -- -------------------------------------------------------------------------
    -- Status Transition: REJECTED
    -- -------------------------------------------------------------------------
    ELSIF NEW.status = 'rejected' THEN
      PERFORM set_config('app.internal_trigger', 'true', true);

      -- 1. Atomically record rejection note on applicant profile
      UPDATE public.alumni_profiles
      SET id_submission_status = 'rejected',
          admin_review_note = coalesce(NEW.admin_note, 'Document unclear or incomplete. Please upload a clear photo of your NDC ID or HSC slip.'),
          updated_at = now()
      WHERE id = NEW.user_id;

      PERFORM set_config('app.internal_trigger', 'false', true);

      -- 2. Insert notification with rejection note (length strictly <= 1500 chars)
      INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        title,
        message,
        target_route
      ) VALUES (
        NEW.user_id,
        v_reviewer_id,
        'verification'::public.notification_type,
        'Verification Document Review Update',
        substring(
          coalesce(
            CASE
              WHEN NEW.admin_note IS NOT NULL AND trim(NEW.admin_note) <> ''
              THEN 'Review note: ' || trim(NEW.admin_note)
              ELSE NULL
            END,
            'Your verification document submission could not be verified. Please check your Verification Center.'
          )
          from 1 for 1500
        ),
        'profile'
      );
    END IF;

    -- 3. Write immutable audit log
    PERFORM public.write_audit_log(
      'ADMIN_DOC_SUBMISSION_' || upper(NEW.status::TEXT),
      'admin_doc_submissions',
      NEW.id::TEXT,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'doc_type', NEW.doc_type, 'user_id', NEW.user_id, 'reviewer_id', v_reviewer_id),
      NEW.admin_note
    );

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_admin_doc_submission_review() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_admin_doc_submission_review() TO service_role;

DROP TRIGGER IF EXISTS trg_handle_admin_doc_submission_review ON public.admin_doc_submissions;
CREATE TRIGGER trg_handle_admin_doc_submission_review
  BEFORE INSERT OR UPDATE ON public.admin_doc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_doc_submission_review();

COMMIT;
