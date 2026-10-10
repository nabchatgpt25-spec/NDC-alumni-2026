-- =============================================================================
-- MIGRATION 011: Align Verification Center with Live Database & Edge Functions
-- Project: Notre Dame College (NDC) Alumni Network
-- Description:
--   1. Adds administrative review notes & ID submission status columns to alumni_profiles.
--   2. Updates RLS policies to allow verified alumni across batches to resolve shared vouch links.
--   3. Provides a secure, privacy-preserving RPC to resolve active peer vouch requests without
--      exposing sensitive PII (email, phone, roll, or private ID uploads).
--   4. Updates the admin document review trigger to synchronize alumni profile status and any
--      linked pending verification requests atomically on the server.
-- =============================================================================

BEGIN;

-- 1. Add verification review tracking columns to public.alumni_profiles if not present
ALTER TABLE public.alumni_profiles
  ADD COLUMN IF NOT EXISTS admin_review_note TEXT NULL,
  ADD COLUMN IF NOT EXISTS id_submission_status VARCHAR(32) NOT NULL DEFAULT 'none'
    CHECK (id_submission_status IN ('none', 'pending', 'approved', 'rejected'));

-- 2. Update RLS on public.verification_requests
--    Allow verified alumni across all batches to view pending verification requests so they
--    can vouch for brothers via deep share links.
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

-- 3. Update RLS on public.peer_vouches
--    Allow verified alumni to view existing vouches on active requests to verify legitimacy.
DROP POLICY IF EXISTS "peer_vouches_select_authorized" ON public.peer_vouches;
CREATE POLICY "peer_vouches_select_authorized"
  ON public.peer_vouches FOR SELECT
  TO authenticated
  USING (
    requester_id = public.current_profile_id()
    OR voucher_id = public.current_profile_id()
    OR public.is_admin_or_mod()
    OR public.is_verified_alumnus()
  );

-- 4. Secure RPC function: Resolve Active Vouch Request for Public / Shared Link Resolution
--    Exposes only display-safe fields (Full Name, Avatar, Batch Year, Stream, Vouch Progress).
--    Never returns private identity documents, email, or mobile number.
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

-- 5. Update admin_doc_submissions trigger to sync alumni_profiles and pending verification requests
CREATE OR REPLACE FUNCTION public.handle_admin_doc_submission_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_reviewer_id BIGINT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := public.current_profile_id();
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.admin_note := NULL;
    NEW.submitted_at := now();
    NEW.updated_at := now();

    -- Mark applicant profile id_submission_status as pending
    UPDATE public.alumni_profiles
    SET id_submission_status = 'pending',
        admin_review_note = NULL
    WHERE id = NEW.user_id;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NOT public.is_admin_or_mod() AND NOT public.is_internal_or_service_role() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators or moderators can review verification documents.';
    END IF;

    v_reviewer_id := public.current_profile_id();
    IF NOT public.is_internal_or_service_role() AND (v_reviewer_id IS NULL OR v_reviewer_id = OLD.user_id) THEN
      RAISE EXCEPTION 'Unauthorized: You cannot review or approve your own verification document.';
    END IF;

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

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.reviewed_by := coalesce(v_reviewer_id, NEW.reviewed_by);
      NEW.reviewed_at := now();

      IF NEW.status = 'approved' THEN
        PERFORM set_config('app.internal_trigger', 'true', true);

        -- Promote applicant to verified
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
              WHEN NOT ('Verified Notredamian' = ANY(badges))
                THEN array_append(badges, 'Verified Notredamian')
              ELSE badges
            END
        WHERE id = NEW.user_id;

        -- Also mark any active pending verification request for this user as verified
        UPDATE public.verification_requests
        SET status = 'verified',
            reviewed_by = v_reviewer_id,
            reviewed_at = now(),
            admin_note = coalesce(NEW.admin_note, 'Approved by admin via ID document verification')
        WHERE requester_id = NEW.user_id
          AND status = 'pending';

        PERFORM set_config('app.internal_trigger', 'false', true);

        INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, target_route)
        VALUES (
          NEW.user_id,
          v_reviewer_id,
          'verification',
          'Document Verification Approved',
          'Your submitted NDC verification document has been approved by the Alumni Secretariat.',
          'profile'
        );
      ELSIF NEW.status = 'rejected' THEN
        -- Record rejection on profile
        UPDATE public.alumni_profiles
        SET id_submission_status = 'rejected',
            admin_review_note = coalesce(NEW.admin_note, 'Document unclear or incomplete.')
        WHERE id = NEW.user_id;

        INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, target_route)
        VALUES (
          NEW.user_id,
          v_reviewer_id,
          'verification',
          'Verification Document Review Update',
          coalesce('Review note: ' || NEW.admin_note, 'Your verification document submission could not be verified. Please check your Verification Center.'),
          'profile'
        );
      END IF;

      PERFORM public.write_audit_log(
        'ADMIN_DOC_SUBMISSION_' || upper(NEW.status::TEXT),
        'admin_doc_submissions',
        NEW.id::TEXT,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status, 'doc_type', NEW.doc_type, 'user_id', NEW.user_id),
        NEW.admin_note
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_admin_doc_submission_review ON public.admin_doc_submissions;
CREATE TRIGGER trg_handle_admin_doc_submission_review
  BEFORE INSERT OR UPDATE ON public.admin_doc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_doc_submission_review();

COMMIT;
