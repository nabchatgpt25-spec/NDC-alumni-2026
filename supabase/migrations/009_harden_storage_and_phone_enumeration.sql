-- =============================================================================
-- Migration 009: tighten Storage ownership and phone availability RPC access
-- This migration is committed for review only; it must be applied through the
-- project’s controlled migration process after staging validation.
-- =============================================================================

BEGIN;

REVOKE ALL ON FUNCTION public.check_phone_available(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- 0. ENSURE RLS IS ENABLED ON storage.objects
-- -----------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. AVATARS (PUBLIC BUCKET)
-- -----------------------------------------------------------------------------
-- 1.1 Anyone can view avatars (public read)
DROP POLICY IF EXISTS "Avatars: Public Access" ON storage.objects;
CREATE POLICY "Avatars: Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 1.2 Authenticated alumni can upload an avatar
DROP POLICY IF EXISTS "Avatars: Authenticated Upload" ON storage.objects;
CREATE POLICY "Avatars: Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

-- 1.3 Authenticated alumni can update their avatar
DROP POLICY IF EXISTS "Avatars: Authenticated Update" ON storage.objects;
CREATE POLICY "Avatars: Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (owner = auth.uid() OR public.is_admin_or_mod()))
WITH CHECK (bucket_id = 'avatars' AND (owner = auth.uid() OR public.is_admin_or_mod()));

-- 1.4 Authenticated alumni can delete their avatar
DROP POLICY IF EXISTS "Avatars: Authenticated Delete" ON storage.objects;
CREATE POLICY "Avatars: Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (owner = auth.uid() OR public.is_admin_or_mod()));

-- -----------------------------------------------------------------------------
-- 2. POST-MEDIA (PUBLIC BUCKET)
-- -----------------------------------------------------------------------------
-- 2.1 Anyone can view feed post images and attachments
DROP POLICY IF EXISTS "Post Media: Public Access" ON storage.objects;
CREATE POLICY "Post Media: Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

-- 2.2 Authenticated alumni can upload media for feed posts
DROP POLICY IF EXISTS "Post Media: Authenticated Upload" ON storage.objects;
CREATE POLICY "Post Media: Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media' AND owner = auth.uid());

-- 2.3 Authenticated alumni can update their post media
DROP POLICY IF EXISTS "Post Media: Authenticated Update" ON storage.objects;
CREATE POLICY "Post Media: Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'post-media' AND (owner = auth.uid() OR public.is_admin_or_mod()))
WITH CHECK (bucket_id = 'post-media' AND (owner = auth.uid() OR public.is_admin_or_mod()));

-- 2.4 Authenticated alumni can delete their media (admins can moderate)
DROP POLICY IF EXISTS "Post Media: Authenticated Delete" ON storage.objects;
CREATE POLICY "Post Media: Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-media' AND (owner = auth.uid() OR public.is_admin_or_mod()));

-- -----------------------------------------------------------------------------
-- 3. GALLERY (PUBLIC BUCKET)
-- -----------------------------------------------------------------------------
-- 3.1 Anyone can view historical campus albums and photo galleries
DROP POLICY IF EXISTS "Gallery: Public Access" ON storage.objects;
CREATE POLICY "Gallery: Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

-- 3.2 Authenticated members can upload gallery photos
DROP POLICY IF EXISTS "Gallery: Authenticated Upload" ON storage.objects;
CREATE POLICY "Gallery: Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery' AND owner = auth.uid());

-- 3.3 Authenticated members can update gallery photos
DROP POLICY IF EXISTS "Gallery: Authenticated Update" ON storage.objects;
CREATE POLICY "Gallery: Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery' AND (owner = auth.uid() OR public.is_admin_or_mod()))
WITH CHECK (bucket_id = 'gallery' AND (owner = auth.uid() OR public.is_admin_or_mod()));

-- 3.4 Authenticated members/admins can delete gallery photos
DROP POLICY IF EXISTS "Gallery: Authenticated Delete" ON storage.objects;
CREATE POLICY "Gallery: Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery' AND (owner = auth.uid() OR public.is_admin_or_mod()));

-- -----------------------------------------------------------------------------
-- 4. VERIFICATION-DOCUMENTS (STRICTLY PRIVATE BUCKET)
-- -----------------------------------------------------------------------------
-- 4.1 Strict access: ONLY the document owner or verified administrators can read
DROP POLICY IF EXISTS "Verification Documents: Owner or Admin Select" ON storage.objects;
CREATE POLICY "Verification Documents: Owner or Admin Select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (
    (auth.uid() = owner)
    OR (auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1])
    OR public.is_admin_or_mod()
  )
);

-- 4.2 Authenticated alumni can upload identity documents for verification
DROP POLICY IF EXISTS "Verification Documents: Authenticated Upload" ON storage.objects;
CREATE POLICY "Verification Documents: Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND owner = auth.uid()
);

-- 4.3 Only the owner or administrators can update verification files
DROP POLICY IF EXISTS "Verification Documents: Owner or Admin Update" ON storage.objects;
CREATE POLICY "Verification Documents: Owner or Admin Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (
    (auth.uid() = owner)
    OR (auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1])
    OR public.is_admin_or_mod()
  )
)
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (
    (auth.uid() = owner)
    OR (auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1])
    OR public.is_admin_or_mod()
  )
);

-- 4.4 Only the owner or administrators can delete verification files
DROP POLICY IF EXISTS "Verification Documents: Owner or Admin Delete" ON storage.objects;
CREATE POLICY "Verification Documents: Owner or Admin Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (
    (auth.uid() = owner)
    OR (auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1])
    OR public.is_admin_or_mod()
  )
);
