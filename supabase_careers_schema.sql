-- =========================================================================
-- SUPABASE CAREER & OPPORTUNITIES SYSTEM SCHEMA (Migration File)
-- Notre Dame College Alumni Portal
-- 
-- Tables:
-- 1. public.career_opportunities (Job, Internship & Referral postings)
-- 2. public.career_applications  (One-click alumni applications)
--
-- Features:
-- - Strict constraints & validation
-- - Automated timestamps trigger
-- - Optimized composite indexes
-- - Row Level Security (RLS) policies
-- - Clean, production-ready (NO DEMO DATA)
-- =========================================================================

-- Ensure pgcrypto / uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. CAREER OPPORTUNITIES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(trim(title)) >= 3),
    company TEXT NOT NULL CHECK (char_length(trim(company)) >= 2),
    location TEXT NOT NULL CHECK (char_length(trim(location)) >= 2),
    type TEXT NOT NULL CHECK (type IN ('job', 'internship', 'referral')),
    description TEXT NOT NULL CHECK (char_length(trim(description)) >= 10),
    
    -- Poster Identity
    poster_id BIGINT NOT NULL,
    poster_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    poster_name TEXT NOT NULL,
    poster_batch TEXT NOT NULL,
    poster_avatar TEXT,
    poster_email TEXT,

    -- Opportunity Lifecycle
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indexing for high-performance browsing and filtering
CREATE INDEX IF NOT EXISTS idx_career_opportunities_status_created 
    ON public.career_opportunities (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_career_opportunities_type 
    ON public.career_opportunities (type) 
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_career_opportunities_poster_id 
    ON public.career_opportunities (poster_id);

CREATE INDEX IF NOT EXISTS idx_career_opportunities_poster_auth 
    ON public.career_opportunities (poster_auth_id);

-- -------------------------------------------------------------------------
-- 2. CAREER APPLICATIONS TABLE (One-Click Applications)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES public.career_opportunities(id) ON DELETE CASCADE,
    
    -- Applicant Identity
    applicant_id BIGINT NOT NULL,
    applicant_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    applicant_name TEXT NOT NULL,
    applicant_batch TEXT,
    applicant_avatar TEXT,
    applicant_email TEXT,
    applicant_phone TEXT,

    -- Application Lifecycle
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'shortlisted', 'rejected')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    -- Prevent multiple applications to the exact same opportunity by the same alumnus
    CONSTRAINT unique_alumnus_opportunity_application UNIQUE (opportunity_id, applicant_id)
);

-- Indexing for rapid applicant lookups and counts
CREATE INDEX IF NOT EXISTS idx_career_applications_opp_id 
    ON public.career_applications (opportunity_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_career_applications_applicant_id 
    ON public.career_applications (applicant_id);

CREATE INDEX IF NOT EXISTS idx_career_applications_auth_id 
    ON public.career_applications (applicant_auth_id);

-- -------------------------------------------------------------------------
-- 3. AUTOMATIC UPDATED_AT TRIGGER
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_career_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_career_opportunities_updated_at ON public.career_opportunities;
CREATE TRIGGER trg_career_opportunities_updated_at
    BEFORE UPDATE ON public.career_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_career_updated_at();

-- -------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------
ALTER TABLE public.career_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

-- Opportunities Policies:
-- 1. Anyone logged in can read active opportunities
CREATE POLICY "Allow authenticated read career opportunities"
    ON public.career_opportunities
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Verified alumni / authenticated users can insert opportunities
CREATE POLICY "Allow verified alumni to insert career opportunities"
    ON public.career_opportunities
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = poster_auth_id OR poster_auth_id IS NULL);

-- 3. Poster can update their own opportunity (e.g. mark closed or edit details)
CREATE POLICY "Allow poster to update own career opportunity"
    ON public.career_opportunities
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = poster_auth_id)
    WITH CHECK (auth.uid() = poster_auth_id);

-- 4. Poster can delete their own opportunity
CREATE POLICY "Allow poster to delete own career opportunity"
    ON public.career_opportunities
    FOR DELETE
    TO authenticated
    USING (auth.uid() = poster_auth_id);

-- Applications Policies:
-- 1. Applicant can see their own applications, AND the opportunity poster can see all applications submitted to their post
CREATE POLICY "Allow applicant and poster to select applications"
    ON public.career_applications
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = applicant_auth_id
        OR EXISTS (
            SELECT 1 FROM public.career_opportunities opp
            WHERE opp.id = career_applications.opportunity_id
              AND opp.poster_auth_id = auth.uid()
        )
    );

-- 2. Applicant can submit application (one-click apply)
CREATE POLICY "Allow authenticated alumnus to apply"
    ON public.career_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = applicant_auth_id OR applicant_auth_id IS NULL);

-- 3. Poster can update application status (e.g. mark reviewed/shortlisted)
CREATE POLICY "Allow poster to update applicant status"
    ON public.career_applications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.career_opportunities opp
            WHERE opp.id = career_applications.opportunity_id
              AND opp.poster_auth_id = auth.uid()
        )
    );

-- =========================================================================
-- End of Career Schema Migration
-- =========================================================================
