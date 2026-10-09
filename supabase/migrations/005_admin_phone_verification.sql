-- =============================================================================
-- MIGRATION 005: ADMIN-VERIFIED PHONE NUMBER LOGIN SUPPORT
-- Project: Notre Dame College (NDC) Alumni Platform
-- Target: Supabase PostgreSQL
-- =============================================================================

BEGIN;

-- 1. Add Phone Ownership Verification Columns to public.alumni_profiles
ALTER TABLE public.alumni_profiles
  ADD COLUMN IF NOT EXISTS phone_ownership_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS phone_verified_by_profile_id BIGINT NULL REFERENCES public.alumni_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone_verification_notes TEXT NULL;

-- 2. Partial Unique Index on Verified Phone Numbers
-- Ensures two active verified alumni accounts cannot claim the exact same verified mobile number
CREATE UNIQUE INDEX IF NOT EXISTS uq_alumni_verified_phone
  ON public.alumni_profiles (phone)
  WHERE phone_ownership_verified = TRUE AND phone IS NOT NULL;

-- 3. Index for Admin Verification Queue queries
CREATE INDEX IF NOT EXISTS idx_alumni_phone_verification_queue
  ON public.alumni_profiles (phone_ownership_verified, batch_year)
  WHERE phone IS NOT NULL;

-- 4. Audit Log Comment
COMMENT ON COLUMN public.alumni_profiles.phone_ownership_verified IS 'Indicates whether an administrator has independently verified ownership of this phone number to permit Phone + Password login.';
COMMENT ON COLUMN public.alumni_profiles.phone_verified_at IS 'Timestamp when administrator approved phone ownership verification.';
COMMENT ON COLUMN public.alumni_profiles.phone_verified_by_profile_id IS 'Admin profile ID who validated phone ownership.';
COMMENT ON COLUMN public.alumni_profiles.phone_verification_notes IS 'Audit notes regarding the phone verification method (e.g. phone call, batch representative confirmation).';

COMMIT;
