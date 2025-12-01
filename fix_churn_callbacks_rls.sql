-- ========================================
-- Complete RLS Fix for churn_callbacks
-- Run this ONCE in Supabase SQL Editor
-- ========================================

-- Step 1: Drop ALL existing policies on churn_callbacks
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'churn_callbacks') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.churn_callbacks';
    END LOOP;
END $$;

-- Step 2: Disable RLS temporarily
ALTER TABLE public.churn_callbacks DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE public.churn_callbacks ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a single permissive policy for all authenticated users
CREATE POLICY "churn_callbacks_full_access"
ON public.churn_callbacks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'churn_callbacks';
