-- =============================================================================
-- Migration 013: Expand Post Categories to include Blood Donation & Alumni Streams
-- =============================================================================

DO $$ BEGIN
  ALTER TYPE public.post_category_type ADD VALUE IF NOT EXISTS 'Blood Donation';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.post_category_type ADD VALUE IF NOT EXISTS 'Campus Memories';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.post_category_type ADD VALUE IF NOT EXISTS 'Higher Studies & Research';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.post_category_type ADD VALUE IF NOT EXISTS 'Prayer & Condolence';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
