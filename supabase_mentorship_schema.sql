-- =========================================================================
-- SUPABASE MENTORSHIP SYSTEM SCHEMA (Production Ready - Clean Schema)
-- Notre Dame College Alumni Mentorship Network
-- 
-- Includes:
-- 1. UUID Extension
-- 2. Core Tables: mentor_profiles, mentorship_requests, mentorship_answers
-- 3. High-Performance B-Tree Indexes
-- 4. Automatic Triggers (updated_at timestamp & auto-status updates)
-- 5. Row Level Security (RLS) Policies (Guest & Authenticated)
-- 6. Supabase Realtime Publication Registration
-- 7. Optional Data Cleanup / Truncate Script
-- =========================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 2. TABLES DEFINITION
-- =========================================================================

-- A. Mentor Profiles (Senior Alumni offering guidance across Medical, Job, Abroad, Degree, Business)
CREATE TABLE IF NOT EXISTS public.mentor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    batch_year INTEGER,
    avatar_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('Medical', 'Job', 'Abroad', 'Degree', 'Business', 'Other')),
    expertise TEXT NOT NULL,
    short_description TEXT NOT NULL,
    institution TEXT,
    position TEXT,
    contact_preference TEXT DEFAULT 'Email / Message',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B. Mentorship Requests (Questions from Juniors / Seekers)
CREATE TABLE IF NOT EXISTS public.mentorship_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_batch INTEGER,
    user_avatar TEXT,
    topic TEXT NOT NULL CHECK (topic IN ('Medical', 'Job', 'Abroad', 'Degree', 'Business', 'Other')),
    question TEXT NOT NULL,
    contact_info TEXT,
    status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'answered', 'closed')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C. Mentorship Answers (Advice and solutions from seniors)
CREATE TABLE IF NOT EXISTS public.mentorship_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.mentorship_requests(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    mentor_profile_id UUID REFERENCES public.mentor_profiles(id) ON DELETE SET NULL,
    mentor_name TEXT NOT NULL,
    mentor_batch INTEGER,
    mentor_profession TEXT,
    mentor_avatar TEXT,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 3. INDEXES FOR HIGH-SPEED FILTERING & SEARCH
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_category ON public.mentor_profiles(category);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_batch ON public.mentor_profiles(batch_year);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_user ON public.mentor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_active ON public.mentor_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_mentorship_requests_topic ON public.mentorship_requests(topic);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_status ON public.mentorship_requests(status);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_created ON public.mentorship_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_user ON public.mentorship_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_mentorship_answers_request_id ON public.mentorship_answers(request_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_answers_mentor ON public.mentorship_answers(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_answers_created ON public.mentorship_answers(created_at ASC);

-- =========================================================================
-- 4. AUTOMATIC TRIGGERS
-- =========================================================================

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_mentorship_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_mentor_updated_at ON public.mentor_profiles;
CREATE TRIGGER set_mentor_updated_at
BEFORE UPDATE ON public.mentor_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_mentorship_updated_at();

DROP TRIGGER IF EXISTS set_request_updated_at ON public.mentorship_requests;
CREATE TRIGGER set_request_updated_at
BEFORE UPDATE ON public.mentorship_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_mentorship_updated_at();

-- Trigger to automatically mark a question request as 'answered' when an answer is inserted
CREATE OR REPLACE FUNCTION public.handle_new_mentorship_answer()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.mentorship_requests
    SET status = 'answered',
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.request_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_mentorship_answer_created ON public.mentorship_answers;
CREATE TRIGGER on_mentorship_answer_created
AFTER INSERT ON public.mentorship_answers
FOR EACH ROW EXECUTE FUNCTION public.handle_new_mentorship_answer();

-- =========================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_answers ENABLE ROW LEVEL SECURITY;

-- Clean existing policies before recreating
DROP POLICY IF EXISTS "Public read active mentors" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Users can create own mentor profile" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Users can update own mentor profile" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Users can delete own mentor profile" ON public.mentor_profiles;

DROP POLICY IF EXISTS "Public read mentorship requests" ON public.mentorship_requests;
DROP POLICY IF EXISTS "Anyone or authenticated can submit request" ON public.mentorship_requests;
DROP POLICY IF EXISTS "Users can update own requests" ON public.mentorship_requests;
DROP POLICY IF EXISTS "Users can delete own requests" ON public.mentorship_requests;

DROP POLICY IF EXISTS "Public read mentorship answers" ON public.mentorship_answers;
DROP POLICY IF EXISTS "Authenticated users can submit answers" ON public.mentorship_answers;
DROP POLICY IF EXISTS "Mentors can update own answers" ON public.mentorship_answers;
DROP POLICY IF EXISTS "Mentors can delete own answers" ON public.mentorship_answers;

-- A. Mentor Profiles Policies
-- 1. Anyone (public or logged-in) can view active mentors
CREATE POLICY "Public read active mentors" 
ON public.mentor_profiles FOR SELECT 
USING (is_active = TRUE);

-- 2. Authenticated users can register their mentor profile
CREATE POLICY "Users can create own mentor profile" 
ON public.mentor_profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 3. Users can update only their own mentor profile
CREATE POLICY "Users can update own mentor profile" 
ON public.mentor_profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- 4. Users can delete their own mentor profile
CREATE POLICY "Users can delete own mentor profile" 
ON public.mentor_profiles FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- B. Mentorship Requests Policies
-- 1. Anyone can view all mentorship questions
CREATE POLICY "Public read mentorship requests" 
ON public.mentorship_requests FOR SELECT 
USING (TRUE);

-- 2. Authenticated users and guests can ask questions
CREATE POLICY "Anyone or authenticated can submit request" 
ON public.mentorship_requests FOR INSERT 
WITH CHECK (TRUE);

-- 3. Seekers can update or close their own questions
CREATE POLICY "Users can update own requests" 
ON public.mentorship_requests FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- 4. Seekers can delete their own questions
CREATE POLICY "Users can delete own requests" 
ON public.mentorship_requests FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- C. Mentorship Answers Policies
-- 1. Anyone can read answers
CREATE POLICY "Public read mentorship answers" 
ON public.mentorship_answers FOR SELECT 
USING (TRUE);

-- 2. Authenticated users can submit answers
CREATE POLICY "Authenticated users can submit answers" 
ON public.mentorship_answers FOR INSERT 
TO authenticated 
WITH CHECK (TRUE);

-- 3. Mentors can edit their own answers
CREATE POLICY "Mentors can update own answers" 
ON public.mentorship_answers FOR UPDATE 
TO authenticated 
USING (auth.uid() = mentor_id);

-- 4. Mentors can delete their own answers
CREATE POLICY "Mentors can delete own answers" 
ON public.mentorship_answers FOR DELETE 
TO authenticated 
USING (auth.uid() = mentor_id);

-- =========================================================================
-- 6. ENABLE SUPABASE REALTIME REPLICATION
-- =========================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'mentorship_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_requests;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_answers;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_profiles;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- In case publication doesn't exist in standard local postgres
    NULL;
END $$;

-- =========================================================================
-- 7. DATA PURGE & CLEANUP STATEMENT (NO DEMO DATA)
-- 
-- If you already populated test records and want to start completely fresh:
-- Run this command in Supabase SQL Editor:
-- =========================================================================
-- TRUNCATE TABLE public.mentorship_answers, public.mentorship_requests, public.mentor_profiles CASCADE;
