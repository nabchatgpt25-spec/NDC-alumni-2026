-- =============================================================================
-- MIGRATION 008: EXPAND ACADEMIC STREAM GROUPS (SAFE ADDITIVE MIGRATION)
-- Project: Notre Dame College (NDC) Alumni Platform
-- Target: Supabase PostgreSQL
-- Description:
--   Populates individual group code entries for Science (01 to 17) and
--   completes Business Studies groups (G, H) in `public.academic_stream_groups`.
--   Enables alumni profiles to validate against specific group codes in
--   foreign key and trigger validations.
--   Safe and additive: Uses ON CONFLICT DO NOTHING without modifying
--   existing rows or dropping any constraints.
-- =============================================================================

BEGIN;

-- 1. Science Groups 01 through 17
INSERT INTO public.academic_stream_groups (
  stream,
  group_code,
  expected_group_count,
  is_active
)
VALUES
  ('Science', '01', 17, TRUE),
  ('Science', '02', 17, TRUE),
  ('Science', '03', 17, TRUE),
  ('Science', '04', 17, TRUE),
  ('Science', '05', 17, TRUE),
  ('Science', '06', 17, TRUE),
  ('Science', '07', 17, TRUE),
  ('Science', '08', 17, TRUE),
  ('Science', '09', 17, TRUE),
  ('Science', '10', 17, TRUE),
  ('Science', '11', 17, TRUE),
  ('Science', '12', 17, TRUE),
  ('Science', '13', 17, TRUE),
  ('Science', '14', 17, TRUE),
  ('Science', '15', 17, TRUE),
  ('Science', '16', 17, TRUE),
  ('Science', '17', 17, TRUE)
ON CONFLICT (stream, group_code) DO NOTHING;

-- 2. Business Studies Groups G and H
INSERT INTO public.academic_stream_groups (
  stream,
  group_code,
  expected_group_count,
  is_active
)
VALUES
  ('Business Studies', 'G', 8, TRUE),
  ('Business Studies', 'H', 8, TRUE)
ON CONFLICT (stream, group_code) DO NOTHING;

COMMIT;
