-- =============================================================================
-- Migration 010: normalized and unique mobile login aliases.
--
-- This migration does not rewrite/delete existing profiles or Auth users.
-- It aborts before index creation when existing canonical phone collisions
-- need human resolution. Apply only after reviewing that preflight result.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_alumni_phone_alias(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = ''
AS $function$
DECLARE
  v_digits TEXT := pg_catalog.regexp_replace(pg_catalog.btrim(p_phone), '[^0-9]', '', 'g');
BEGIN
  IF v_digits LIKE '8801%' AND pg_catalog.char_length(v_digits) = 13 THEN
    IF v_digits ~ '^8801[3-9][0-9]{8}$' THEN
      RETURN '+' || v_digits;
    END IF;
    RETURN NULL;
  END IF;

  IF v_digits LIKE '01%' AND pg_catalog.char_length(v_digits) = 11 THEN
    IF v_digits ~ '^01[3-9][0-9]{8}$' THEN
      RETURN '+88' || v_digits;
    END IF;
    RETURN NULL;
  END IF;

  IF v_digits ~ '^1[3-9][0-9]{8}$' THEN
    RETURN '+880' || v_digits;
  END IF;

  IF v_digits ~ '^[0-9]{7,15}$' THEN
    RETURN '+' || v_digits;
  END IF;

  RETURN NULL;
END;
$function$;

-- Fail without changing records when legacy formats contain duplicate aliases.
DO $preflight$
DECLARE
  v_duplicate_groups BIGINT;
BEGIN
  SELECT count(*)
  INTO v_duplicate_groups
  FROM (
    SELECT public.normalize_alumni_phone_alias(phone) AS phone_alias
    FROM public.alumni_profiles
    WHERE phone IS NOT NULL
      AND public.normalize_alumni_phone_alias(phone) IS NOT NULL
    GROUP BY public.normalize_alumni_phone_alias(phone)
    HAVING count(*) > 1
  ) AS duplicates;

  IF v_duplicate_groups > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce unique normalized phone aliases: % collision group(s) exist. No data was changed; resolve collisions before retrying.',
      v_duplicate_groups;
  END IF;
END;
$preflight$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_alumni_profiles_normalized_phone_alias
  ON public.alumni_profiles (public.normalize_alumni_phone_alias(phone))
  WHERE phone IS NOT NULL
    AND public.normalize_alumni_phone_alias(phone) IS NOT NULL;

-- Normalize all future phone writes while preserving current rows.
CREATE OR REPLACE FUNCTION public.normalize_alumni_profile_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_normalized TEXT;
BEGIN
  IF NEW.phone IS NULL OR pg_catalog.btrim(NEW.phone) = '' THEN
    NEW.phone := NULL;
    RETURN NEW;
  END IF;

  v_normalized := public.normalize_alumni_phone_alias(NEW.phone);
  IF v_normalized IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Please provide a valid mobile number.';
  END IF;

  NEW.phone := v_normalized;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_normalize_alumni_profile_phone ON public.alumni_profiles;
CREATE TRIGGER trg_normalize_alumni_profile_phone
  BEFORE INSERT OR UPDATE OF phone ON public.alumni_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_alumni_profile_phone();

-- Reuse the existing availability RPC with distributed rate limits.
-- The unique index remains the authoritative race-safe rule.
CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_phone_alias TEXT;
  v_headers JSONB := '{}'::JSONB;
  v_forwarded_for TEXT;
  v_client_ip TEXT;
  v_ip_allowed BOOLEAN;
  v_phone_allowed BOOLEAN;
BEGIN
  v_phone_alias := public.normalize_alumni_phone_alias(p_phone);
  IF v_phone_alias IS NULL THEN
    RETURN FALSE;
  END IF;

  BEGIN
    v_headers := coalesce(
      nullif(current_setting('request.headers', TRUE), ''),
      '{}'
    )::JSONB;
  EXCEPTION WHEN OTHERS THEN
    v_headers := '{}'::JSONB;
  END;

  v_forwarded_for := pg_catalog.btrim(
    pg_catalog.split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)
  );
  v_client_ip := pg_catalog.left(
    coalesce(
      nullif(pg_catalog.btrim(v_headers ->> 'cf-connecting-ip'), ''),
      nullif(v_forwarded_for, ''),
      'unknown'
    ),
    64
  );

  SELECT public.check_and_increment_rate_limit(
    'phone_signup_ip:' || v_client_ip,
    20,
    60
  ) INTO v_ip_allowed;

  SELECT public.check_and_increment_rate_limit(
    'phone_signup_alias:' || v_phone_alias,
    5,
    60
  ) INTO v_phone_allowed;

  IF NOT coalesce(v_ip_allowed, FALSE)
     OR NOT coalesce(v_phone_allowed, FALSE) THEN
    RETURN FALSE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.alumni_profiles AS p
    WHERE public.normalize_alumni_phone_alias(p.phone) = v_phone_alias
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.check_phone_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.normalize_alumni_phone_alias(TEXT) IS
  'Canonical E.164 key used to enforce uniqueness of alumni mobile login aliases.';
COMMENT ON FUNCTION public.check_phone_available(TEXT) IS
  'Rate-limited availability check for registration; the normalized unique index is authoritative.';

COMMIT;

