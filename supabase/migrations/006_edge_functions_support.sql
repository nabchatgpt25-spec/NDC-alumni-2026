-- =============================================================================
-- MIGRATION 006: DISTRIBUTED RATE LIMITING & EDGE FUNCTIONS SUPPORT
-- Project: Notre Dame College (NDC) Alumni Platform
-- Target: Supabase PostgreSQL (Free Tier compatible, Zero External Services)
-- Description: Creates atomic distributed rate limiting table and function.
--              Strictly restricted to trusted server-side execution (service_role).
-- =============================================================================

BEGIN;

-- 1. Distributed Rate Limiter Table
-- Replaces ephemeral in-memory rate limiting across multi-region Supabase Edge Functions
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on reset_at for fast expiration cleanup
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_reset ON public.auth_rate_limits (reset_at);

-- Enable RLS and revoke client access
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.auth_rate_limits TO service_role;

-- 2. Atomic Rate-Limiting Function (SECURITY DEFINER)
-- Atomically checks and increments attempts within a sliding time window.
-- Uses clock_timestamp() for real-time concurrency across transactions.
-- Returns TRUE if request is within limits, FALSE if rate limit exceeded.
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key TEXT,
  p_max_attempts INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_attempts INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Housekeeping: delete expired entry for this key if it passed reset_at
  DELETE FROM public.auth_rate_limits WHERE key = p_key AND reset_at <= v_now;

  -- Upsert: insert initial attempt or increment existing valid window
  INSERT INTO public.auth_rate_limits (key, attempts, reset_at)
  VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (key) DO UPDATE
  SET attempts = CASE 
    WHEN public.auth_rate_limits.reset_at <= clock_timestamp() THEN 1 
    ELSE public.auth_rate_limits.attempts + 1 
  END,
  reset_at = CASE
    WHEN public.auth_rate_limits.reset_at <= clock_timestamp() THEN clock_timestamp() + (p_window_seconds || ' seconds')::INTERVAL
    ELSE public.auth_rate_limits.reset_at
  END
  RETURNING attempts, reset_at INTO v_attempts, v_reset_at;

  IF v_attempts > p_max_attempts THEN
    RETURN FALSE; -- Block: Rate limit exceeded
  END IF;

  RETURN TRUE; -- Allow: Within quota
END;
$$;

-- Explicitly revoke from public, anon, and authenticated so clients cannot call this RPC
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

-- Allow ONLY the trusted server-side role (used by Edge Functions) to execute
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Comments for database documentation
COMMENT ON TABLE public.auth_rate_limits IS 'Stores distributed sliding-window rate limit counters for Edge Functions across global instances.';
COMMENT ON FUNCTION public.check_and_increment_rate_limit IS 'Atomic distributed rate limiter for phone login, admin actions, and public crawlers. Callable only via service_role.';

COMMIT;
