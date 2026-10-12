-- =============================================================================
-- Migration: 012_add_linked_url_and_metadata_to_posts.sql
-- Project: NDC Alumni Network 2026
-- Description: Add universal link preview columns to public.posts
-- NOTE: Owner will run manually in Supabase SQL Editor. Do NOT auto-execute.
-- =============================================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS linked_url text,
  ADD COLUMN IF NOT EXISTS link_metadata jsonb;

-- Optional index for querying posts with embedded links
CREATE INDEX IF NOT EXISTS idx_posts_linked_url ON public.posts(linked_url) WHERE linked_url IS NOT NULL;
