-- =============================================================================
-- Standalone equivalent of migration 009 for manual review/application.
-- Run the entire file as one transaction.
-- Does not alter bucket settings or Storage object data.
-- =============================================================================

BEGIN;

-- =============================================================================
-- Secure policies for the four existing Supabase Storage buckets.
--
-- Does not create/delete buckets, alter public/private flags, or modify objects.
-- Public bucket downloads use the buckets' existing public setting. SELECT
-- policies below only allow authenticated owners/admins/moderators to query
-- object metadata (needed for upsert); anon users get no bucket-list policy.
-- =============================================================================

-- Validate prerequisites before changing policies. The current Storage schema
-- uses owner_id (owner is deprecated); fail atomically if this is not present.
DO $preflight$
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'Required table storage.objects does not exist.';
  END IF;
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE EXCEPTION 'Required table storage.buckets does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = to_regclass('storage.objects')
      AND attname = 'owner_id'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'storage.objects.owner_id is required by this migration.';
  END IF;

  IF to_regclass('public.alumni_profiles') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_attribute
       WHERE attrelid = to_regclass('public.alumni_profiles')
         AND attname = 'auth_user_id'
         AND NOT attisdropped
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_attribute
       WHERE attrelid = to_regclass('public.alumni_profiles')
         AND attname = 'role'
         AND NOT attisdropped
     ) THEN
    RAISE EXCEPTION 'public.alumni_profiles(auth_user_id, role) is required.';
  END IF;

  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'Required function auth.uid() does not exist.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    RAISE EXCEPTION 'Supabase roles authenticated and anon are required.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars' AND public)
     OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'gallery' AND public)
     OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'post-media' AND public)
     OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'verification-documents' AND NOT public) THEN
    RAISE EXCEPTION 'Expected existing Storage buckets and public/private settings were not found.';
  END IF;
END;
$preflight$;

-- Supabase Storage enables RLS by default. Keep this idempotent safeguard:
-- pg_policies being empty does not reveal whether the table RLS flag is enabled.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Dedicated database-role check; this migration does not depend on a separate
-- project-specific admin helper. The function reveals only the caller's own role.
CREATE OR REPLACE FUNCTION public.storage_is_admin_or_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.alumni_profiles AS p
    WHERE p.auth_user_id = (SELECT auth.uid())
      AND p.role::text IN ('admin', 'moderator')
  );
$function$;

REVOKE ALL ON FUNCTION public.storage_is_admin_or_moderator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_is_admin_or_moderator() TO authenticated;

-- The scalar SELECT form lets PostgreSQL evaluate the caller checks once per
-- statement. Mutations require ownership unless the caller is an admin/moderator.
-- AVATARS (public bucket)
DROP POLICY IF EXISTS "Avatars: Public Access" ON storage.objects;
CREATE POLICY "Avatars: Public Access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Avatars: Authenticated Upload" ON storage.objects;
CREATE POLICY "Avatars: Authenticated Upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Avatars: Authenticated Update" ON storage.objects;
CREATE POLICY "Avatars: Authenticated Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Avatars: Authenticated Delete" ON storage.objects;
CREATE POLICY "Avatars: Authenticated Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

-- POST-MEDIA (public bucket)
DROP POLICY IF EXISTS "Post Media: Public Access" ON storage.objects;
CREATE POLICY "Post Media: Public Access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'post-media'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Post Media: Authenticated Upload" ON storage.objects;
CREATE POLICY "Post Media: Authenticated Upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-media'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Post Media: Authenticated Update" ON storage.objects;
CREATE POLICY "Post Media: Authenticated Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'post-media'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
)
WITH CHECK (
  bucket_id = 'post-media'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Post Media: Authenticated Delete" ON storage.objects;
CREATE POLICY "Post Media: Authenticated Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'post-media'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

-- GALLERY (public bucket)
DROP POLICY IF EXISTS "Gallery: Public Access" ON storage.objects;
CREATE POLICY "Gallery: Public Access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'gallery'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Gallery: Authenticated Upload" ON storage.objects;
CREATE POLICY "Gallery: Authenticated Upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'gallery'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Gallery: Authenticated Update" ON storage.objects;
CREATE POLICY "Gallery: Authenticated Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'gallery'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
)
WITH CHECK (
  bucket_id = 'gallery'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Gallery: Authenticated Delete" ON storage.objects;
CREATE POLICY "Gallery: Authenticated Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'gallery'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

-- VERIFICATION-DOCUMENTS (private bucket): no anon/public object access policy.
DROP POLICY IF EXISTS "Verification Documents: Owner or Admin Select" ON storage.objects;
CREATE POLICY "Verification Documents: Owner or Admin Select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Verification Documents: Authenticated Upload" ON storage.objects;
CREATE POLICY "Verification Documents: Authenticated Upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Verification Documents: Owner or Admin Update" ON storage.objects;
CREATE POLICY "Verification Documents: Owner or Admin Update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
)
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

DROP POLICY IF EXISTS "Verification Documents: Owner or Admin Delete" ON storage.objects;
CREATE POLICY "Verification Documents: Owner or Admin Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (owner_id = (SELECT auth.uid()::text) OR (SELECT public.storage_is_admin_or_moderator()))
);

COMMIT;
