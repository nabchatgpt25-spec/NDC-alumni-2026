-- =============================================================================
-- MIGRATION 007: SAFE ADDITIVE PHONE LOGIN & UNIQUENESS SUPPORT
-- Project: Notre Dame College (NDC) Alumni Platform
-- Target: Supabase PostgreSQL
-- Description:
--   1. Adds SECURITY DEFINER helper public.check_phone_available() to allow
--      safe pre-registration availability checks without exposing private phone numbers.
--   2. Adds lookup index on phone column for high-speed edge function queries.
--   3. Does NOT modify or delete any existing user accounts or database records.
--   4. Preserves all existing RLS policies and table structures.
-- =============================================================================

BEGIN;

-- 1. High-speed lookup index for Edge Function phone queries
CREATE INDEX IF NOT EXISTS idx_alumni_profiles_phone_lookup
  ON public.alumni_profiles (phone)
  WHERE phone IS NOT NULL;

-- 2. SECURITY DEFINER function to check if a phone number is available for registration
-- Returns TRUE if available (not registered by another user), FALSE if already claimed.
CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
  v_exists BOOLEAN;
BEGIN
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN TRUE;
  END IF;

  v_clean := trim(p_phone);

  SELECT EXISTS (
    SELECT 1
    FROM public.alumni_profiles
    WHERE phone = v_clean
       OR phone = replace(v_clean, '+', '')
       OR ('+' || phone) = v_clean
  ) INTO v_exists;

  RETURN NOT v_exists;
END;
$$;

-- Grant execution to anon and authenticated callers
GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.check_phone_available(TEXT) IS
  'Checks if a phone number is available during registration without exposing registered alumni phone numbers.';

COMMIT;
