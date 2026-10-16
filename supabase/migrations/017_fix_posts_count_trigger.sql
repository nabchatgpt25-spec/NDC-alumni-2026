-- =============================================================================
-- MIGRATION 017: FIX POST CREATION TRIGGER BUG (posts_count is server-controlled)
-- Project: Notre Dame College (NDC) Alumni Platform
-- Target: Supabase PostgreSQL
--
-- ROOT CAUSE:
-- In Migration 016, public.protect_privileged_profile_columns() was updated
-- to prevent users from altering server-controlled counters. However, during UPDATE,
-- the check on posts_count:
--     IF NEW.posts_count IS DISTINCT FROM OLD.posts_count THEN
--       RAISE EXCEPTION 'Unauthorized: posts_count is server-controlled.';
--     END IF;
-- was placed without checking `IF NOT public.is_internal_or_service_role()`.
--
-- Whenever any user creates ANY post (text, image, video, link, or gallery activity),
-- the AFTER INSERT trigger `trg_sync_user_posts_count` on `public.posts` runs
-- `UPDATE public.alumni_profiles SET posts_count = posts_count + 1 WHERE id = NEW.author_id;`.
-- This update caused `protect_privileged_profile_columns()` to immediately abort
-- the transaction with error: 'Unauthorized: posts_count is server-controlled.'.
--
-- SOLUTION:
-- 1. Update `public.protect_privileged_profile_columns()` to permit trusted internal
--    triggers and service_role to maintain `posts_count` and `vouches_count`.
-- 2. Grant EXECUTE on `public.is_internal_or_service_role()` so SECURITY DEFINER
--    triggers running under authenticated caller context evaluate properly.
-- 3. Ensure `public.sync_user_posts_count()` sets `app.internal_trigger = 'true'`
--    so internal updates are always recognized.
-- =============================================================================

BEGIN;

SET search_path = public, extensions;

-- 1. Ensure public.is_internal_or_service_role() can be called inside triggers
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

GRANT EXECUTE ON FUNCTION public.is_internal_or_service_role() TO authenticated, service_role;

-- 2. Fix public.protect_privileged_profile_columns() to allow internal trigger counter updates
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Bypass all guards if executing within a trusted internal trigger or as service_role
  IF public.is_internal_or_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- If auth.uid() is active, enforce that the profile belongs to the caller
    IF auth.uid() IS NOT NULL THEN
      IF NEW.auth_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: auth_user_id must match authenticated session.';
      END IF;
    END IF;

    -- Force server-controlled defaults for non-privileged insertions
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
    NEW.phone_ownership_verified := FALSE;
    NEW.created_at := now();
    NEW.updated_at := now();

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'Identity columns (id, auth_user_id) cannot be modified.';
    END IF;
    NEW.created_at := OLD.created_at;

    -- Only check server-controlled counters for direct client updates
    IF NOT public.is_internal_or_service_role() THEN
      IF NEW.posts_count IS DISTINCT FROM OLD.posts_count THEN
        RAISE EXCEPTION 'Unauthorized: posts_count is server-controlled.';
      END IF;
      IF NEW.vouches_count IS DISTINCT FROM OLD.vouches_count THEN
        RAISE EXCEPTION 'Unauthorized: vouches_count is server-controlled.';
      END IF;
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
        RAISE EXCEPTION 'Unauthorized: Verification status is controlled by network administrators.';
      END IF;
      IF NEW.phone_ownership_verified IS DISTINCT FROM OLD.phone_ownership_verified THEN
        RAISE EXCEPTION 'Unauthorized: Phone verification is controlled by administrators.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Ensure sync_user_posts_count sets internal_trigger before updating
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

-- 4. Re-bind triggers
DROP TRIGGER IF EXISTS trg_protect_privileged_profile_columns ON public.alumni_profiles;
CREATE TRIGGER trg_protect_privileged_profile_columns
  BEFORE INSERT OR UPDATE ON public.alumni_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_profile_columns();

DROP TRIGGER IF EXISTS trg_sync_user_posts_count ON public.posts;
CREATE TRIGGER trg_sync_user_posts_count
  AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_posts_count();

COMMIT;
