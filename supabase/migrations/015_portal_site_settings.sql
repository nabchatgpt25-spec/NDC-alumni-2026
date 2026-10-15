-- =============================================================================
-- MIGRATION 015: PORTAL SITE SETTINGS & INSTITUTIONAL BRANDING SYNC
-- Project: Notre Dame College (NDC) Alumni Platform
-- Description: Stores site-wide branding, logo presets, hero background, reunion
--              countdown dates, and broadcast announcements so changes made by
--              an admin are instantly shared across all alumni devices.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.portal_site_settings (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'current',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by_profile_id BIGINT NULL REFERENCES public.alumni_profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.portal_site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (including public guests & alumni) can read the site settings (logo, hero, reunion date)
DROP POLICY IF EXISTS "Public can view portal site settings" ON public.portal_site_settings;
CREATE POLICY "Public can view portal site settings"
  ON public.portal_site_settings
  FOR SELECT
  TO public
  USING (true);

-- Only verified admins or moderators can update or insert site settings
DROP POLICY IF EXISTS "Admins can update portal site settings" ON public.portal_site_settings;
CREATE POLICY "Admins can update portal site settings"
  ON public.portal_site_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.alumni_profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.alumni_profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role IN ('admin', 'moderator')
    )
  );

COMMIT;
