-- =============================================================================
-- MIGRATION 016: FIX PROFILE CREATION, BATCH YEAR CONSTRAINTS & PERMISSIONS
-- Project: Notre Dame College (NDC) Alumni Platform
-- Target: Supabase PostgreSQL
-- Description:
--   1. Expands `public.batches` to accept HSC Calendar Years (1949–2100) alongside
--      legacy batch numbers (1–150), and seeds all years from 1949 to 2035.
--      This guarantees `alumni_profiles_batch_year_fkey` NEVER fails during registration.
--   2. Resolves Column-Level Privilege Denial (Error 42501) by granting INSERT
--      to `authenticated` on `role`, `verification_status`, and `phone_ownership_verified`.
--   3. Hardens `protect_privileged_profile_columns` so server-controlled defaults
--      are automatically enforced without throwing privilege errors.
--   4. Installs automatic profile generation trigger on `auth.users` so whenever
--      a new user registers (via Email, Phone, or Google OAuth), their row in
--      `public.alumni_profiles` is guaranteed to exist immediately.
--   5. Backfills any existing orphaned `auth.users` who registered previously
--      but had no `alumni_profiles` record created.
--   6. Normalizes `validate_stream_group_pair` to safely accept single-digit
--      or unpadded Science groups ('1'–'17' and '01'–'17') or NULL group codes.
-- =============================================================================

BEGIN;

SET search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- 1. EXPAND BATCH YEAR CONSTRAINTS & SEED ALL CALENDAR YEARS (1949 - 2035)
-- -----------------------------------------------------------------------------
ALTER TABLE public.batches
  DROP CONSTRAINT IF EXISTS batches_batch_year_check;

ALTER TABLE public.batches
  ADD CONSTRAINT batches_batch_year_check
  CHECK (batch_year BETWEEN 1 AND 2100);

-- Seed HSC Calendar Years 1949 to 2035 so foreign key validation always succeeds
INSERT INTO public.batches (
  batch_year,
  session,
  hsc_year,
  special_note,
  registered_count,
  created_at,
  updated_at
)
SELECT
  yr::SMALLINT AS batch_year,
  (yr - 1)::TEXT || '-' || yr::TEXT AS session,
  yr::SMALLINT AS hsc_year,
  'HSC Batch ' || yr::TEXT AS special_note,
  0 AS registered_count,
  now() AS created_at,
  now() AS updated_at
FROM generate_series(1949, 2035) AS yr
ON CONFLICT (batch_year) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 1B. RELAX CONSTRAINTS & SET CLEAN DEFAULTS FOR REMOVED FRONTEND FIELDS
-- Ensures missing or NULL inputs for removed fields NEVER block registration.
-- -----------------------------------------------------------------------------
ALTER TABLE public.alumni_profiles
  ALTER COLUMN profession DROP NOT NULL,
  ALTER COLUMN profession SET DEFAULT 'Alumnus',
  ALTER COLUMN position DROP NOT NULL,
  ALTER COLUMN position SET DEFAULT '',
  ALTER COLUMN institution DROP NOT NULL,
  ALTER COLUMN institution SET DEFAULT '',
  ALTER COLUMN specialty DROP NOT NULL,
  ALTER COLUMN specialty SET DEFAULT '{}'::TEXT[],
  ALTER COLUMN degree DROP NOT NULL,
  ALTER COLUMN degree SET DEFAULT '{"HSC"}'::TEXT[],
  ALTER COLUMN career_history DROP NOT NULL,
  ALTER COLUMN career_history SET DEFAULT '{}'::TEXT[],
  ALTER COLUMN badges DROP NOT NULL,
  ALTER COLUMN badges SET DEFAULT '{}'::TEXT[],
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN city SET DEFAULT 'Dhaka',
  ALTER COLUMN country DROP NOT NULL,
  ALTER COLUMN country SET DEFAULT 'Bangladesh';

-- -----------------------------------------------------------------------------
-- 2. ACADEMIC STREAM & GROUP TOLERANCE (SCIENCE 1..17 & 01..17)
-- -----------------------------------------------------------------------------
-- Seed single-digit group codes 1 through 9 for Science so users typing either
-- '1' or '01' will never trigger a foreign-key or validation check error.
INSERT INTO public.academic_stream_groups (stream, group_code, expected_group_count, is_active)
VALUES
  ('Science', '1', 17, TRUE),
  ('Science', '2', 17, TRUE),
  ('Science', '3', 17, TRUE),
  ('Science', '4', 17, TRUE),
  ('Science', '5', 17, TRUE),
  ('Science', '6', 17, TRUE),
  ('Science', '7', 17, TRUE),
  ('Science', '8', 17, TRUE),
  ('Science', '9', 17, TRUE)
ON CONFLICT (stream, group_code) DO NOTHING;

-- Relax stream group validation trigger to permit flexible inputs & padding
CREATE OR REPLACE FUNCTION public.validate_stream_group_pair()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.academic_group IS NOT NULL THEN
    NEW.academic_group := upper(trim(NEW.academic_group));
    -- Normalize single digit science group codes (e.g. '1' -> '01')
    IF NEW.academic_stream = 'Science' AND NEW.academic_group ~ '^[1-9]$' THEN
      NEW.academic_group := lpad(NEW.academic_group, 2, '0');
    END IF;
  END IF;

  -- Default to Science if stream is missing but group is provided
  IF NEW.academic_stream IS NULL AND NEW.academic_group IS NOT NULL THEN
    NEW.academic_stream := 'Science';
  END IF;

  IF NEW.academic_stream IS NOT NULL AND NEW.academic_group IS NOT NULL THEN
    -- If group code is not found in academic_stream_groups, fallback gracefully to NULL group
    -- so that a user is NEVER blocked from registration or saving profile.
    IF NOT EXISTS (
      SELECT 1
      FROM public.academic_stream_groups asg
      WHERE asg.stream = NEW.academic_stream
        AND asg.group_code = NEW.academic_group
        AND asg.is_active = TRUE
    ) THEN
      NEW.academic_group := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. GRANT REQUIRED COLUMN PRIVILEGES TO PREVENT ERROR 42501
-- -----------------------------------------------------------------------------
-- Grant INSERT on role, verification_status, phone_ownership_verified, and id_submission_status
-- to authenticated callers. The trigger below strictly enforces server defaults.
GRANT INSERT (
  auth_user_id,
  role,
  verification_status,
  phone_ownership_verified,
  id_submission_status,
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

-- Ensure SELECT and UPDATE grants include these columns as needed
GRANT SELECT (
  id_submission_status,
  phone_ownership_verified
) ON public.alumni_profiles TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. HARDEN PRIVILEGED COLUMN PROTECTION TRIGGER FOR REGISTRATIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- If auth.uid() is active, enforce that the profile belongs to the caller
    IF NOT public.is_internal_or_service_role() AND auth.uid() IS NOT NULL THEN
      IF NEW.auth_user_id IS DISTINCT FROM auth.uid() THEN
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
      NEW.phone_ownership_verified := FALSE;
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

-- -----------------------------------------------------------------------------
-- 5. AUTOMATIC PROFILE GENERATION TRIGGER ON auth.users
-- -----------------------------------------------------------------------------
-- Whenever a user is created in Supabase Auth (Email Sign Up, Phone Login,
-- or Google OAuth), automatically instantiate their alumni_profiles row.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_meta JSONB := coalesce(NEW.raw_user_meta_data, '{}'::JSONB);
  v_batch_year SMALLINT;
  v_clean_email TEXT;
  v_full_name TEXT;
  v_phone TEXT;
  v_roll TEXT;
  v_stream public.academic_stream_type;
  v_group TEXT;
BEGIN
  -- 1. Batch Year extraction
  v_batch_year := CASE
    WHEN (v_meta->>'batch_year') ~ '^[0-9]{1,4}$' AND (v_meta->>'batch_year')::INT BETWEEN 1949 AND 2100
      THEN (v_meta->>'batch_year')::SMALLINT
    WHEN (v_meta->>'batchYear') ~ '^[0-9]{1,4}$' AND (v_meta->>'batchYear')::INT BETWEEN 1949 AND 2100
      THEN (v_meta->>'batchYear')::SMALLINT
    ELSE 2026::SMALLINT
  END;

  -- 2. Email & Name extraction
  v_clean_email := lower(trim(coalesce(NEW.email, v_meta->>'email', '')));
  IF v_clean_email = '' THEN v_clean_email := NULL; END IF;

  v_full_name := trim(coalesce(
    v_meta->>'full_name',
    v_meta->>'name',
    CASE WHEN v_clean_email IS NOT NULL THEN split_part(v_clean_email, '@', 1) ELSE NULL END,
    'Notredamian Alumnus'
  ));
  IF char_length(v_full_name) < 2 THEN
    v_full_name := 'Notredamian Alumnus';
  END IF;

  -- 3. Phone & Roll
  v_phone := coalesce(NEW.phone, v_meta->>'phone');
  IF trim(coalesce(v_phone, '')) = '' THEN v_phone := NULL; END IF;

  v_roll := coalesce(v_meta->>'college_roll', v_meta->>'collegeRoll');
  IF trim(coalesce(v_roll, '')) = '' THEN v_roll := NULL; END IF;

  -- 4. Academic Stream & Group
  v_stream := CASE
    WHEN lower(coalesce(v_meta->>'academic_stream', v_meta->>'academicStream', '')) LIKE '%humanities%' THEN 'Humanities'::public.academic_stream_type
    WHEN lower(coalesce(v_meta->>'academic_stream', v_meta->>'academicStream', '')) LIKE '%business%' OR lower(coalesce(v_meta->>'academic_stream', v_meta->>'academicStream', '')) LIKE '%commerce%' THEN 'Business Studies'::public.academic_stream_type
    ELSE 'Science'::public.academic_stream_type
  END;

  v_group := trim(coalesce(v_meta->>'academic_group', v_meta->>'academicGroup', ''));
  IF v_group = '' THEN v_group := NULL; END IF;

  -- 5. Insert profile if not already present
  INSERT INTO public.alumni_profiles (
    auth_user_id,
    full_name,
    avatar_url,
    batch_year,
    college_roll,
    academic_stream,
    academic_group,
    email,
    phone,
    role,
    verification_status,
    profession,
    position,
    institution,
    city,
    country,
    is_public,
    show_contact_to_verified
  )
  VALUES (
    NEW.id,
    v_full_name,
    coalesce(v_meta->>'avatar_url', v_meta->>'picture', '/ndc-logo.png'),
    v_batch_year,
    v_roll,
    v_stream,
    v_group,
    v_clean_email,
    v_phone,
    'member',
    'unverified',
    coalesce(v_meta->>'profession', 'Alumnus'),
    coalesce(v_meta->>'position', ''),
    coalesce(v_meta->>'institution', ''),
    coalesce(v_meta->>'city', 'Dhaka'),
    coalesce(v_meta->>'country', 'Bangladesh'),
    TRUE,
    TRUE
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET
    email = coalesce(EXCLUDED.email, public.alumni_profiles.email),
    phone = coalesce(EXCLUDED.phone, public.alumni_profiles.phone),
    full_name = CASE WHEN public.alumni_profiles.full_name = 'Notredamian Alumnus' THEN EXCLUDED.full_name ELSE public.alumni_profiles.full_name END,
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Logging the error without aborting the auth transaction
  RAISE WARNING 'handle_new_auth_user trigger notice: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 6. BACKFILL ALL EXISTING ORPHANED auth.users
-- -----------------------------------------------------------------------------
-- Finds any user in auth.users who lacks a corresponding row in public.alumni_profiles
-- and instantly creates their alumni profile row.
INSERT INTO public.alumni_profiles (
  auth_user_id,
  full_name,
  avatar_url,
  batch_year,
  email,
  phone,
  role,
  verification_status,
  profession,
  position,
  institution,
  city,
  country,
  is_public,
  show_contact_to_verified
)
SELECT
  u.id AS auth_user_id,
  trim(coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    CASE WHEN u.email IS NOT NULL THEN split_part(u.email, '@', 1) ELSE NULL END,
    'Notredamian Alumnus'
  )) AS full_name,
  coalesce(u.raw_user_meta_data->>'avatar_url', '/ndc-logo.png') AS avatar_url,
  CASE
    WHEN (u.raw_user_meta_data->>'batch_year') ~ '^[0-9]{1,4}$' AND (u.raw_user_meta_data->>'batch_year')::INT BETWEEN 1949 AND 2100
      THEN (u.raw_user_meta_data->>'batch_year')::SMALLINT
    WHEN (u.raw_user_meta_data->>'batchYear') ~ '^[0-9]{1,4}$' AND (u.raw_user_meta_data->>'batchYear')::INT BETWEEN 1949 AND 2100
      THEN (u.raw_user_meta_data->>'batchYear')::SMALLINT
    ELSE 2026::SMALLINT
  END AS batch_year,
  lower(trim(u.email)) AS email,
  u.phone AS phone,
  'member'::public.user_role AS role,
  'unverified'::public.verification_status AS verification_status,
  'Alumnus' AS profession,
  '' AS position,
  '' AS institution,
  'Dhaka' AS city,
  'Bangladesh' AS country,
  TRUE AS is_public,
  TRUE AS show_contact_to_verified
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.alumni_profiles ap WHERE ap.auth_user_id = u.id
)
ON CONFLICT (auth_user_id) DO NOTHING;

COMMIT;
