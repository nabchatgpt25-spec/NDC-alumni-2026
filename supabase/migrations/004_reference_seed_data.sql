-- =============================================================================
-- MIGRATION 004: STATIC & REFERENCE SEED DATA ONLY
-- Project: Notre Dame College (NDC) Alumni Platform
-- Target: Supabase PostgreSQL
--
-- STRICT PRODUCTION DATA POLICY:
-- 1. Seeds ONLY structurally required batch_year keys (1 through 78) in
--    `public.batches` so foreign-key references on `alumni_profiles.batch_year`
--    succeed.
-- 2. Does NOT seed fabricated `estimated_total` formulas, invented
--    `representative_name` values, unverified `session` strings, or invented
--    historical labels; all unverified institutional fields are set to NULL.
-- 3. Reference placeholder rows in `public.official_notices` are explicitly
--    labeled `[REFERENCE PLACEHOLDER]` and set to `is_published = FALSE` so
--    they never appear as live published notices.
-- 4. Contains ZERO fake alumni profiles, ZERO demo accounts, ZERO fake posts,
--    ZERO fake comments/likes, ZERO fake verification requests, and ZERO fake
--    blood donors/requests.
-- =============================================================================

BEGIN;

SET search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- 1. BATCH REFERENCE KEYS (Batches 1 to 78)
-- Only `batch_year` and `registered_count = 0` are populated; unverified
-- institutional fields remain NULL until entered by an administrator.
-- -----------------------------------------------------------------------------
INSERT INTO public.batches (
  batch_year,
  session,
  hsc_year,
  special_note,
  representative_name,
  representative_profile_id,
  registered_count,
  estimated_total
)
SELECT
  b.batch_num::SMALLINT AS batch_year,
  NULL AS session,
  NULL AS hsc_year,
  NULL AS special_note,
  NULL AS representative_name,
  NULL AS representative_profile_id,
  0 AS registered_count,
  NULL AS estimated_total
FROM generate_series(1, 78) AS b(batch_num)
ON CONFLICT (batch_year) DO UPDATE
SET
  session = NULL,
  hsc_year = NULL,
  special_note = NULL,
  representative_name = NULL,
  estimated_total = NULL,
  updated_at = now()
WHERE public.batches.representative_profile_id IS NULL;

-- -----------------------------------------------------------------------------
-- 1B. ACADEMIC STREAM & GROUP CONFIGURATION (`public.academic_stream_groups`)
-- Seeds ONLY verified group codes for Humanities (G, H, L, W) and Business
-- Studies (A, B, C, D, E, F), plus the stream-level capacity metadata row for
-- Science (`group_code = NULL`, `expected_group_count = 17`).
-- Does NOT invent any of the 17 Science group codes or historical batch rules.
-- -----------------------------------------------------------------------------
INSERT INTO public.academic_stream_groups (
  stream,
  group_code,
  expected_group_count,
  is_active
)
VALUES
  -- Science metadata only (17 groups expected; official group codes not invented)
  ('Science', NULL, 17, TRUE)
ON CONFLICT (stream) WHERE group_code IS NULL DO UPDATE
SET
  expected_group_count = EXCLUDED.expected_group_count,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.academic_stream_groups (
  stream,
  group_code,
  expected_group_count,
  is_active
)
VALUES
  -- Humanities official groups (4 groups: G, H, L, W)
  ('Humanities', 'G', 4, TRUE),
  ('Humanities', 'H', 4, TRUE),
  ('Humanities', 'L', 4, TRUE),
  ('Humanities', 'W', 4, TRUE),

  -- Business Studies official groups (6 groups: A, B, C, D, E, F)
  ('Business Studies', 'A', 6, TRUE),
  ('Business Studies', 'B', 6, TRUE),
  ('Business Studies', 'C', 6, TRUE),
  ('Business Studies', 'D', 6, TRUE),
  ('Business Studies', 'E', 6, TRUE),
  ('Business Studies', 'F', 6, TRUE)
ON CONFLICT (stream, group_code) DO UPDATE
SET
  expected_group_count = EXCLUDED.expected_group_count,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 2. UNPUBLISHED REFERENCE PLACEHOLDER NOTICES (`is_published = FALSE`)
-- Stored strictly as unpublished drafts (`is_published = FALSE`) so they are
-- hidden from anonymous and non-admin users in production.
-- -----------------------------------------------------------------------------
INSERT INTO public.official_notices (
  ref_no,
  title,
  category,
  published_date,
  is_urgent,
  summary,
  full_content,
  pdf_url,
  file_size,
  signatory_name,
  signatory_designation,
  signatory_organization,
  is_published
)
VALUES
  (
    'NDCAA/REF-2026/001',
    '[REFERENCE PLACEHOLDER] Alumni Reunion Notice Template (Unpublished Draft)',
    'Reunion',
    CURRENT_DATE,
    FALSE,
    '[REFERENCE PLACEHOLDER] Unpublished template record for testing administrative notice management.',
    E'[REFERENCE PLACEHOLDER — NOT AN OFFICIAL ANNOUNCEMENT]\n\nThis record is an unpublished placeholder template (`is_published = FALSE`) for internal administrative testing only.',
    NULL,
    NULL,
    '[REFERENCE PLACEHOLDER]',
    '[REFERENCE PLACEHOLDER]',
    'Notre Dame College Alumni Association',
    FALSE
  ),
  (
    'NDCAA/REF-2026/002',
    '[REFERENCE PLACEHOLDER] Membership Verification Notice Template (Unpublished Draft)',
    'Membership',
    CURRENT_DATE,
    FALSE,
    '[REFERENCE PLACEHOLDER] Unpublished template record for testing membership verification notice workflows.',
    E'[REFERENCE PLACEHOLDER — NOT AN OFFICIAL ANNOUNCEMENT]\n\nThis record is an unpublished placeholder template (`is_published = FALSE`) for internal administrative testing only.',
    NULL,
    NULL,
    '[REFERENCE PLACEHOLDER]',
    '[REFERENCE PLACEHOLDER]',
    'Notre Dame College Alumni Association',
    FALSE
  )
ON CONFLICT (ref_no) DO UPDATE
SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  is_urgent = FALSE,
  summary = EXCLUDED.summary,
  full_content = EXCLUDED.full_content,
  pdf_url = NULL,
  file_size = NULL,
  signatory_name = EXCLUDED.signatory_name,
  signatory_designation = EXCLUDED.signatory_designation,
  is_published = FALSE,
  updated_at = now();

COMMIT;
