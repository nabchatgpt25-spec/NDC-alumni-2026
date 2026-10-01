-- =============================================================================
-- MIGRATION 002: SECURITY HELPER FUNCTIONS, TRIGGERS & PRIVILEGE GUARDS
-- Project: Notre Dame College (NDC) Alumni Platform
-- Target: Supabase PostgreSQL
-- =============================================================================

BEGIN;

SET search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- 1. CORE AUTHORIZATION & IDENTITY HELPER FUNCTIONS
-- Every SECURITY DEFINER function uses SET search_path = public, extensions
-- and explicitly revokes PUBLIC execution, granting EXECUTE only to required roles.
-- -----------------------------------------------------------------------------

-- 1.1 Returns the BIGINT profile ID of the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id
  FROM public.alumni_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated, service_role;

-- 1.2 Returns the server-enforced role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT role
  FROM public.alumni_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, service_role;

-- 1.3 Returns TRUE iff the current user has role = 'admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.alumni_profiles
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 1.4 Returns TRUE iff the current user has role IN ('admin', 'moderator')
CREATE OR REPLACE FUNCTION public.is_admin_or_mod()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.alumni_profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'moderator')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_or_mod() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_mod() TO authenticated, service_role;

-- 1.5 Returns TRUE iff the current user has verification_status = 'verified'
CREATE OR REPLACE FUNCTION public.is_verified_alumnus()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.alumni_profiles
    WHERE auth_user_id = auth.uid()
      AND verification_status = 'verified'
  );
$$;

REVOKE ALL ON FUNCTION public.is_verified_alumnus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_verified_alumnus() TO authenticated, service_role;

-- 1.6 Returns the batch_year of the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_user_batch_year()
RETURNS SMALLINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT batch_year
  FROM public.alumni_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_batch_year() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_batch_year() TO authenticated, service_role;

-- 1.7 Returns TRUE iff executing inside a trusted nested trigger or service_role context.
-- Requires pg_trigger_depth() > 1 whenever relying on `app.internal_trigger = 'true'`.
-- Direct client statements run table triggers at pg_trigger_depth() = 1, so a client
-- setting `app.internal_trigger` in their session can NEVER bypass trigger protections.
CREATE OR REPLACE FUNCTION public.is_internal_or_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT (
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
    OR (
      pg_trigger_depth() > 1
      AND coalesce(current_setting('app.internal_trigger', true), '') = 'true'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_internal_or_service_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_internal_or_service_role() TO service_role;

-- 1.8 Controlled RPC for retrieving sensitive contact fields only when permitted.
CREATE OR REPLACE FUNCTION public.get_alumni_contact_details(p_profile_id BIGINT)
RETURNS TABLE (
  profile_id BIGINT,
  email extensions.citext,
  phone VARCHAR(32),
  whatsapp VARCHAR(32),
  fb_link TEXT,
  college_roll VARCHAR(32)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access alumni contact details.';
  END IF;

  RETURN QUERY
  SELECT
    ap.id AS profile_id,
    CASE
      WHEN ap.auth_user_id = auth.uid()
        OR public.is_admin_or_mod()
        OR (public.is_verified_alumnus() AND ap.is_public = TRUE AND ap.show_contact_to_verified = TRUE)
      THEN ap.email
      ELSE NULL
    END AS email,
    CASE
      WHEN ap.auth_user_id = auth.uid()
        OR public.is_admin_or_mod()
        OR (public.is_verified_alumnus() AND ap.is_public = TRUE AND ap.show_contact_to_verified = TRUE)
      THEN ap.phone
      ELSE NULL
    END AS phone,
    CASE
      WHEN ap.auth_user_id = auth.uid()
        OR public.is_admin_or_mod()
        OR (public.is_verified_alumnus() AND ap.is_public = TRUE AND ap.show_contact_to_verified = TRUE)
      THEN ap.whatsapp
      ELSE NULL
    END AS whatsapp,
    CASE
      WHEN ap.auth_user_id = auth.uid()
        OR public.is_admin_or_mod()
        OR (public.is_verified_alumnus() AND ap.is_public = TRUE AND ap.show_contact_to_verified = TRUE)
      THEN ap.fb_link
      ELSE NULL
    END AS fb_link,
    CASE
      WHEN ap.auth_user_id = auth.uid()
        OR public.is_admin_or_mod()
        OR (
          public.is_verified_alumnus()
          AND ap.is_public = TRUE
          AND ap.batch_year = public.current_user_batch_year()
        )
      THEN ap.college_roll
      ELSE NULL
    END AS college_roll
  FROM public.alumni_profiles ap
  WHERE ap.id = p_profile_id
    AND (
      ap.is_public = TRUE
      OR ap.auth_user_id = auth.uid()
      OR public.is_admin_or_mod()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_alumni_contact_details(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_alumni_contact_details(BIGINT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. SANITIZED INTERNAL AUDIT LOGGING FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sanitize_audit_payload(p_payload JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN p_payload IS NULL THEN NULL
    ELSE (
      p_payload
      - 'password'
      - 'encrypted_password'
      - 'access_token'
      - 'refresh_token'
      - 'token'
      - 'secret'
      - 'otp'
      - 'storage_object_path'
      - 'document_url'
      - 'id_proof_url'
      - 'search_vector'
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.sanitize_audit_payload(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_audit_payload(JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action VARCHAR(120),
  p_entity_table VARCHAR(64),
  p_entity_id TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile_id BIGINT;
  v_role public.user_role;
BEGIN
  IF pg_trigger_depth() < 1
     AND coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     AND session_user NOT IN ('postgres', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'Unauthorized: write_audit_log is an internal server function.';
  END IF;

  SELECT id, role INTO v_profile_id, v_role
  FROM public.alumni_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  INSERT INTO public.audit_logs (
    actor_profile_id,
    actor_auth_id,
    actor_role,
    action,
    entity_table,
    entity_id,
    old_values,
    new_values,
    reason
  ) VALUES (
    v_profile_id,
    auth.uid(),
    v_role,
    p_action,
    p_entity_table,
    p_entity_id,
    public.sanitize_audit_payload(p_old_values),
    public.sanitize_audit_payload(p_new_values),
    p_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log(VARCHAR, VARCHAR, TEXT, JSONB, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(VARCHAR, VARCHAR, TEXT, JSONB, JSONB, TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- 3. UPDATED_AT TIMESTAMP TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_academic_stream_groups_updated_at ON public.academic_stream_groups;
CREATE TRIGGER trg_academic_stream_groups_updated_at
  BEFORE UPDATE ON public.academic_stream_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 3B. ACADEMIC STREAM & GROUP VALIDATION TRIGGER FUNCTION
-- Validates (academic_stream, academic_group) against active rows in
-- `public.academic_stream_groups` while permitting NULL academic_group for
-- historical records and Science (until official Science group codes are added).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_stream_group_pair()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.academic_group IS NOT NULL THEN
    NEW.academic_group := upper(trim(NEW.academic_group));
  END IF;

  IF NEW.academic_stream IS NULL AND NEW.academic_group IS NOT NULL THEN
    RAISE EXCEPTION 'academic_stream is required when academic_group is provided.';
  END IF;

  IF NEW.academic_stream IS NOT NULL AND NEW.academic_group IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.academic_stream_groups asg
      WHERE asg.stream = NEW.academic_stream
        AND asg.is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Invalid or inactive academic_stream: %.', NEW.academic_stream;
    END IF;
  ELSIF NEW.academic_stream IS NOT NULL AND NEW.academic_group IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.academic_stream_groups asg
      WHERE asg.stream = NEW.academic_stream
        AND asg.group_code = NEW.academic_group
        AND asg.is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Invalid or unconfigured academic_group (%) for stream (%).', NEW.academic_group, NEW.academic_stream;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_stream_group_pair() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_alumni_stream_group ON public.alumni_profiles;
CREATE TRIGGER trg_validate_alumni_stream_group
  BEFORE INSERT OR UPDATE OF academic_stream, academic_group ON public.alumni_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_stream_group_pair();

DROP TRIGGER IF EXISTS trg_validate_verification_req_stream_group ON public.verification_requests;
CREATE TRIGGER trg_validate_verification_req_stream_group
  BEFORE INSERT OR UPDATE OF academic_stream, academic_group ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_stream_group_pair();

DROP TRIGGER IF EXISTS trg_validate_admin_doc_stream_group ON public.admin_doc_submissions;
CREATE TRIGGER trg_validate_admin_doc_stream_group
  BEFORE INSERT OR UPDATE OF academic_stream, academic_group ON public.admin_doc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.validate_stream_group_pair();

DROP TRIGGER IF EXISTS trg_batches_updated_at ON public.batches;
CREATE TRIGGER trg_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_alumni_profiles_updated_at ON public.alumni_profiles;
CREATE TRIGGER trg_alumni_profiles_updated_at
  BEFORE UPDATE ON public.alumni_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_post_comments_updated_at ON public.post_comments;
CREATE TRIGGER trg_post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_admin_doc_submissions_updated_at ON public.admin_doc_submissions;
CREATE TRIGGER trg_admin_doc_submissions_updated_at
  BEFORE UPDATE ON public.admin_doc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_verification_requests_updated_at ON public.verification_requests;
CREATE TRIGGER trg_verification_requests_updated_at
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_blood_donors_updated_at ON public.blood_donors;
CREATE TRIGGER trg_blood_donors_updated_at
  BEFORE UPDATE ON public.blood_donors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_blood_requests_updated_at ON public.blood_requests;
CREATE TRIGGER trg_blood_requests_updated_at
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_blood_request_responses_updated_at ON public.blood_request_responses;
CREATE TRIGGER trg_blood_request_responses_updated_at
  BEFORE UPDATE ON public.blood_request_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_gallery_albums_updated_at ON public.gallery_albums;
CREATE TRIGGER trg_gallery_albums_updated_at
  BEFORE UPDATE ON public.gallery_albums
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_official_notices_updated_at ON public.official_notices;
CREATE TRIGGER trg_official_notices_updated_at
  BEFORE UPDATE ON public.official_notices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_contact_inquiries_updated_at ON public.contact_inquiries;
CREATE TRIGGER trg_contact_inquiries_updated_at
  BEFORE UPDATE ON public.contact_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 4. PRIVILEGED PROFILE FIELD PROTECTION TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF public.is_internal_or_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'member';
    NEW.verification_status := 'unverified';
    NEW.verification_method := NULL;
    NEW.vouches_count := 0;
    NEW.vouch_target_count := 2;
    NEW.verified_at := NULL;
    NEW.verified_by_profile_id := NULL;
    NEW.badges := '{}'::TEXT[];
    NEW.posts_count := 0;
    NEW.created_at := now();
    NEW.updated_at := now();
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

    IF NOT public.is_admin_or_mod() THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Unauthorized: You cannot change your user role.';
      END IF;
      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.verification_method IS DISTINCT FROM OLD.verification_method
         OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
         OR NEW.verified_by_profile_id IS DISTINCT FROM OLD.verified_by_profile_id
         OR NEW.vouch_target_count IS DISTINCT FROM OLD.vouch_target_count
         OR NEW.badges IS DISTINCT FROM OLD.badges
      THEN
        RAISE EXCEPTION 'Unauthorized: Verification status and badges are server-controlled.';
      END IF;
      RETURN NEW;
    END IF;

    IF NOT public.is_admin() THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
      END IF;
    END IF;

    IF OLD.auth_user_id = auth.uid() THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Unauthorized: You cannot change your own role.';
      END IF;
      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.verification_method IS DISTINCT FROM OLD.verification_method
         OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
         OR NEW.verified_by_profile_id IS DISTINCT FROM OLD.verified_by_profile_id
      THEN
        RAISE EXCEPTION 'Unauthorized: You cannot modify or approve your own verification status.';
      END IF;
    END IF;

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

    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      IF NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN
        NEW.verified_at := coalesce(NEW.verified_at, now());
        NEW.verified_by_profile_id := public.current_profile_id();
        NEW.verification_method := coalesce(NEW.verification_method, 'admin_verified');
        IF NOT ('Verified Notredamian' = ANY(NEW.badges)) THEN
          NEW.badges := array_append(NEW.badges, 'Verified Notredamian');
        END IF;
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

DROP TRIGGER IF EXISTS trg_protect_alumni_profile_columns ON public.alumni_profiles;
CREATE TRIGGER trg_protect_alumni_profile_columns
  BEFORE INSERT OR UPDATE ON public.alumni_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_profile_columns();

-- -----------------------------------------------------------------------------
-- 5. VERIFICATION & PEER VOUCH SERVER-SIDE ENFORCEMENT TRIGGERS
-- -----------------------------------------------------------------------------

-- 5.1 Validate and process peer vouches server-side
CREATE OR REPLACE FUNCTION public.handle_peer_vouch_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_profile_id BIGINT;
  v_voucher_status public.verification_status;
  v_voucher_batch SMALLINT;
  v_req_requester_id BIGINT;
  v_req_status public.request_review_status;
  v_req_target SMALLINT;
  v_new_vouch_count SMALLINT;
BEGIN
  IF NOT public.is_internal_or_service_role() THEN
    v_caller_profile_id := public.current_profile_id();
    IF v_caller_profile_id IS NULL OR NEW.voucher_id IS DISTINCT FROM v_caller_profile_id THEN
      RAISE EXCEPTION 'Unauthorized: voucher_id must match the authenticated user profile.';
    END IF;
  END IF;

  SELECT verification_status, batch_year
  INTO v_voucher_status, v_voucher_batch
  FROM public.alumni_profiles
  WHERE id = NEW.voucher_id;

  IF v_voucher_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Only verified alumni can vouch for a peer.';
  END IF;

  SELECT requester_id, status, target_vouches
  INTO v_req_requester_id, v_req_status, v_req_target
  FROM public.verification_requests
  WHERE id = NEW.verification_request_id
  FOR UPDATE;

  IF v_req_requester_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found.';
  END IF;

  IF v_req_status <> 'pending' THEN
    RAISE EXCEPTION 'Verification request is no longer pending.';
  END IF;

  IF NEW.voucher_id = v_req_requester_id THEN
    RAISE EXCEPTION 'Self-vouching is strictly prohibited.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.peer_vouches pv
    WHERE (pv.verification_request_id = NEW.verification_request_id AND pv.voucher_id = NEW.voucher_id)
       OR (pv.requester_id = v_req_requester_id AND pv.voucher_id = NEW.voucher_id)
  ) THEN
    RAISE EXCEPTION 'Duplicate vouch: You have already vouched for this alumnus.';
  END IF;

  NEW.requester_id := v_req_requester_id;
  NEW.voucher_batch := v_voucher_batch;
  NEW.created_at := now();

  PERFORM set_config('app.internal_trigger', 'true', true);

  UPDATE public.verification_requests
  SET current_vouches = current_vouches + 1,
      status = CASE
        WHEN current_vouches + 1 >= v_req_target THEN 'verified'::public.request_review_status
        ELSE status
      END,
      reviewed_at = CASE
        WHEN current_vouches + 1 >= v_req_target THEN now()
        ELSE reviewed_at
      END
  WHERE id = NEW.verification_request_id
  RETURNING current_vouches INTO v_new_vouch_count;

  UPDATE public.alumni_profiles
  SET vouches_count = v_new_vouch_count,
      verification_status = CASE
        WHEN v_new_vouch_count >= v_req_target THEN 'verified'::public.verification_status
        WHEN verification_status = 'unverified' THEN 'pending_vouch'::public.verification_status
        ELSE verification_status
      END,
      verification_method = CASE
        WHEN v_new_vouch_count >= v_req_target THEN 'two_vouches'::public.verification_method
        ELSE verification_method
      END,
      verified_at = CASE
        WHEN v_new_vouch_count >= v_req_target THEN coalesce(verified_at, now())
        ELSE verified_at
      END,
      badges = CASE
        WHEN v_new_vouch_count >= v_req_target AND NOT ('Verified Notredamian' = ANY(badges))
          THEN array_append(badges, 'Verified Notredamian')
        ELSE badges
      END
  WHERE id = v_req_requester_id;

  PERFORM set_config('app.internal_trigger', 'false', true);

  IF v_new_vouch_count >= v_req_target THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, target_route)
    VALUES (
      v_req_requester_id,
      NEW.voucher_id,
      'verification',
      'Notredamian Verification Complete',
      'You have received the required peer vouches and your profile is now officially verified.',
      'profile'
    );

    PERFORM public.write_audit_log(
      'VERIFICATION_COMPLETED_BY_PEER_VOUCHES',
      'verification_requests',
      NEW.verification_request_id::TEXT,
      jsonb_build_object('status', 'pending'),
      jsonb_build_object('status', 'verified', 'vouches_count', v_new_vouch_count),
      'Reached target peer vouches'
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_peer_vouch_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_handle_peer_vouch_insert ON public.peer_vouches;
CREATE TRIGGER trg_handle_peer_vouch_insert
  BEFORE INSERT ON public.peer_vouches
  FOR EACH ROW EXECUTE FUNCTION public.handle_peer_vouch_insert();

-- 5.2 Protect verification_requests from self-approval & unauthorized field edits
CREATE OR REPLACE FUNCTION public.handle_verification_request_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_reviewer_id BIGINT;
BEGIN
  IF public.is_internal_or_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.requester_id := public.current_profile_id();
    NEW.status := 'pending';
    NEW.current_vouches := 0;
    NEW.target_vouches := 2;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.admin_note := NULL;
    NEW.created_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NOT public.is_admin_or_mod() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators or moderators can update verification requests.';
    END IF;

    v_reviewer_id := public.current_profile_id();
    IF v_reviewer_id IS NULL OR v_reviewer_id = OLD.requester_id THEN
      RAISE EXCEPTION 'Unauthorized: You cannot review or approve your own verification request.';
    END IF;

    NEW.id := OLD.id;
    NEW.requester_id := OLD.requester_id;
    NEW.batch_year := OLD.batch_year;
    NEW.college_roll := OLD.college_roll;
    NEW.academic_stream := OLD.academic_stream;
    NEW.academic_group := OLD.academic_group;
    NEW.current_vouches := OLD.current_vouches;
    NEW.target_vouches := OLD.target_vouches;
    NEW.created_at := OLD.created_at;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.reviewed_by := v_reviewer_id;
      NEW.reviewed_at := now();

      IF NEW.status = 'verified' THEN
        PERFORM set_config('app.internal_trigger', 'true', true);

        UPDATE public.alumni_profiles
        SET verification_status = 'verified',
            verification_method = coalesce(verification_method, 'admin_verified'),
            verified_at = coalesce(verified_at, now()),
            verified_by_profile_id = v_reviewer_id,
            badges = CASE
              WHEN NOT ('Verified Notredamian' = ANY(badges))
                THEN array_append(badges, 'Verified Notredamian')
              ELSE badges
            END
        WHERE id = NEW.requester_id;

        PERFORM set_config('app.internal_trigger', 'false', true);

        INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, target_route)
        VALUES (
          NEW.requester_id,
          v_reviewer_id,
          'verification',
          'Verification Request Approved',
          'Your Notredamian verification request has been approved.',
          'profile'
        );
      END IF;

      PERFORM public.write_audit_log(
        'VERIFICATION_REQUEST_' || upper(NEW.status::TEXT),
        'verification_requests',
        NEW.id::TEXT,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status, 'requester_id', NEW.requester_id),
        NEW.admin_note
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_verification_request_mutation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_handle_verification_request_mutation ON public.verification_requests;
CREATE TRIGGER trg_handle_verification_request_mutation
  BEFORE INSERT OR UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_verification_request_mutation();

-- 5.3 Prevent self-approval & synchronize admin document submission reviews
CREATE OR REPLACE FUNCTION public.handle_admin_doc_submission_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_reviewer_id BIGINT;
BEGIN
  IF public.is_internal_or_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := public.current_profile_id();
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.admin_note := NULL;
    NEW.submitted_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NOT public.is_admin_or_mod() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators or moderators can review verification documents.';
    END IF;

    v_reviewer_id := public.current_profile_id();
    IF v_reviewer_id IS NULL OR v_reviewer_id = OLD.user_id THEN
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
      NEW.reviewed_by := v_reviewer_id;
      NEW.reviewed_at := now();

      IF NEW.status = 'approved' THEN
        PERFORM set_config('app.internal_trigger', 'true', true);

        UPDATE public.alumni_profiles
        SET verification_status = 'verified',
            verification_method = CASE
              WHEN NEW.doc_type = 'souvenir' THEN 'souvenir_photo'::public.verification_method
              ELSE 'id_card_upload'::public.verification_method
            END,
            verified_at = now(),
            verified_by_profile_id = v_reviewer_id,
            badges = CASE
              WHEN NOT ('Verified Notredamian' = ANY(badges))
                THEN array_append(badges, 'Verified Notredamian')
              ELSE badges
            END
        WHERE id = NEW.user_id;

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

REVOKE ALL ON FUNCTION public.handle_admin_doc_submission_review() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_handle_admin_doc_submission_review ON public.admin_doc_submissions;
CREATE TRIGGER trg_handle_admin_doc_submission_review
  BEFORE INSERT OR UPDATE ON public.admin_doc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_doc_submission_review();

-- -----------------------------------------------------------------------------
-- 6. CONTENT & COUNTER INTEGRITY TRIGGERS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_posts_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF public.is_internal_or_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.likes_count := 0;
    NEW.comments_count := 0;
    NEW.is_edited := FALSE;
    NEW.is_deleted := FALSE;
    IF NOT public.is_admin_or_mod() THEN
      NEW.is_pinned := FALSE;
    END IF;
    NEW.created_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.author_id := OLD.author_id;
    NEW.created_at := OLD.created_at;
    NEW.likes_count := OLD.likes_count;
    NEW.comments_count := OLD.comments_count;

    IF NOT public.is_admin_or_mod() THEN
      NEW.is_pinned := OLD.is_pinned;
      IF OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE THEN
        RAISE EXCEPTION 'Unauthorized: Cannot restore a moderated post.';
      END IF;
    END IF;

    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.images IS DISTINCT FROM OLD.images
       OR NEW.videos IS DISTINCT FROM OLD.videos
    THEN
      NEW.is_edited := TRUE;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_posts_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_posts_columns ON public.posts;
CREATE TRIGGER trg_protect_posts_columns
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.protect_posts_columns();

CREATE OR REPLACE FUNCTION public.protect_post_comments_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF public.is_internal_or_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.likes_count := 0;
    NEW.is_deleted := FALSE;
    NEW.created_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.post_id := OLD.post_id;
    NEW.parent_comment_id := OLD.parent_comment_id;
    NEW.user_id := OLD.user_id;
    NEW.likes_count := OLD.likes_count;
    NEW.created_at := OLD.created_at;
    IF NOT public.is_admin_or_mod() AND OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE THEN
      RAISE EXCEPTION 'Unauthorized: Cannot restore a moderated comment.';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_post_comments_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_post_comments_columns ON public.post_comments;
CREATE TRIGGER trg_protect_post_comments_columns
  BEFORE INSERT OR UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.protect_post_comments_columns();

CREATE OR REPLACE FUNCTION public.protect_gallery_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF public.is_internal_or_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'gallery_albums' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.photos_count := 0;
      NEW.created_at := now();
      NEW.updated_at := now();
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.id := OLD.id;
      NEW.created_by_id := OLD.created_by_id;
      NEW.photos_count := OLD.photos_count;
      NEW.created_at := OLD.created_at;
    END IF;
  ELSIF TG_TABLE_NAME = 'gallery_photos' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.likes_count := 0;
      NEW.uploaded_at := now();
      IF NOT public.is_admin_or_mod() THEN
        NEW.is_approved := TRUE;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.id := OLD.id;
      NEW.album_id := OLD.album_id;
      NEW.uploader_id := OLD.uploader_id;
      NEW.url := OLD.url;
      NEW.storage_object_path := OLD.storage_object_path;
      NEW.likes_count := OLD.likes_count;
      NEW.uploaded_at := OLD.uploaded_at;
      IF NOT public.is_admin_or_mod() THEN
        NEW.is_approved := OLD.is_approved;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_gallery_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_gallery_albums_columns ON public.gallery_albums;
CREATE TRIGGER trg_protect_gallery_albums_columns
  BEFORE INSERT OR UPDATE ON public.gallery_albums
  FOR EACH ROW EXECUTE FUNCTION public.protect_gallery_columns();

DROP TRIGGER IF EXISTS trg_protect_gallery_photos_columns ON public.gallery_photos;
CREATE TRIGGER trg_protect_gallery_photos_columns
  BEFORE INSERT OR UPDATE ON public.gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.protect_gallery_columns();

-- 6.3B Protect admin/moderation fields on blood_requests
CREATE OR REPLACE FUNCTION public.protect_blood_requests_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF public.is_internal_or_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.requester_id := public.current_profile_id();
    NEW.created_at := now();
    NEW.updated_at := now();
    IF NOT public.is_admin_or_mod() THEN
      NEW.verified_by_admin_id := NULL;
      NEW.moderation_note := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.requester_id := OLD.requester_id;
    NEW.created_at := OLD.created_at;
    IF NOT public.is_admin_or_mod() THEN
      NEW.verified_by_admin_id := OLD.verified_by_admin_id;
      NEW.moderation_note := OLD.moderation_note;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_blood_requests_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_blood_requests_columns ON public.blood_requests;
CREATE TRIGGER trg_protect_blood_requests_columns
  BEFORE INSERT OR UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_blood_requests_columns();

-- 6.4 Maintain batches.registered_count
CREATE OR REPLACE FUNCTION public.sync_batch_registered_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.batches
    SET registered_count = registered_count + 1
    WHERE batch_year = NEW.batch_year;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.batches
    SET registered_count = GREATEST(0, registered_count - 1)
    WHERE batch_year = OLD.batch_year;
  ELSIF TG_OP = 'UPDATE' AND NEW.batch_year IS DISTINCT FROM OLD.batch_year THEN
    UPDATE public.batches
    SET registered_count = GREATEST(0, registered_count - 1)
    WHERE batch_year = OLD.batch_year;
    UPDATE public.batches
    SET registered_count = registered_count + 1
    WHERE batch_year = NEW.batch_year;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_batch_registered_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_batch_registered_count ON public.alumni_profiles;
CREATE TRIGGER trg_sync_batch_registered_count
  AFTER INSERT OR DELETE OR UPDATE OF batch_year ON public.alumni_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_batch_registered_count();

-- 6.5 Maintain alumni_profiles.posts_count
CREATE OR REPLACE FUNCTION public.sync_user_posts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM set_config('app.internal_trigger', 'true', true);

  IF TG_OP = 'INSERT' AND NEW.is_deleted = FALSE THEN
    UPDATE public.alumni_profiles
    SET posts_count = posts_count + 1
    WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_deleted = FALSE THEN
    UPDATE public.alumni_profiles
    SET posts_count = GREATEST(0, posts_count - 1)
    WHERE id = OLD.author_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
    IF NEW.is_deleted = TRUE THEN
      UPDATE public.alumni_profiles
      SET posts_count = GREATEST(0, posts_count - 1)
      WHERE id = NEW.author_id;
    ELSE
      UPDATE public.alumni_profiles
      SET posts_count = posts_count + 1
      WHERE id = NEW.author_id;
    END IF;
  END IF;

  PERFORM set_config('app.internal_trigger', 'false', true);
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_user_posts_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_user_posts_count ON public.posts;
CREATE TRIGGER trg_sync_user_posts_count
  AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_posts_count();

-- 6.6 Maintain posts.likes_count
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM set_config('app.internal_trigger', 'true', true);

  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
  END IF;

  PERFORM set_config('app.internal_trigger', 'false', true);
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_post_likes_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_post_likes_count ON public.post_likes;
CREATE TRIGGER trg_sync_post_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

-- 6.7 Maintain posts.comments_count
CREATE OR REPLACE FUNCTION public.sync_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM set_config('app.internal_trigger', 'true', true);

  IF TG_OP = 'INSERT' AND NEW.is_deleted = FALSE THEN
    UPDATE public.posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_deleted = FALSE THEN
    UPDATE public.posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
    IF NEW.is_deleted = TRUE THEN
      UPDATE public.posts
      SET comments_count = GREATEST(0, comments_count - 1)
      WHERE id = NEW.post_id;
    ELSE
      UPDATE public.posts
      SET comments_count = comments_count + 1
      WHERE id = NEW.post_id;
    END IF;
  END IF;

  PERFORM set_config('app.internal_trigger', 'false', true);
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_post_comments_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_post_comments_count ON public.post_comments;
CREATE TRIGGER trg_sync_post_comments_count
  AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_comments_count();

-- 6.8 Maintain gallery_albums.photos_count
CREATE OR REPLACE FUNCTION public.sync_gallery_album_photos_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM set_config('app.internal_trigger', 'true', true);

  IF TG_OP = 'INSERT' AND NEW.is_approved = TRUE THEN
    UPDATE public.gallery_albums
    SET photos_count = photos_count + 1
    WHERE id = NEW.album_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_approved = TRUE THEN
    UPDATE public.gallery_albums
    SET photos_count = GREATEST(0, photos_count - 1)
    WHERE id = OLD.album_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_approved = TRUE AND NEW.is_approved = FALSE THEN
      UPDATE public.gallery_albums
      SET photos_count = GREATEST(0, photos_count - 1)
      WHERE id = OLD.album_id;
    ELSIF OLD.is_approved = FALSE AND NEW.is_approved = TRUE THEN
      UPDATE public.gallery_albums
      SET photos_count = photos_count + 1
      WHERE id = NEW.album_id;
    END IF;
  END IF;

  PERFORM set_config('app.internal_trigger', 'false', true);
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_gallery_album_photos_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_gallery_album_photos_count ON public.gallery_photos;
CREATE TRIGGER trg_sync_gallery_album_photos_count
  AFTER INSERT OR DELETE OR UPDATE OF is_approved ON public.gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.sync_gallery_album_photos_count();

COMMIT;
