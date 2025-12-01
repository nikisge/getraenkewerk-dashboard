-- ========================================
-- Secure RLS for churn_callbacks
-- Only allows access for valid reps
-- ========================================

-- Step 1: Clean up old policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'churn_callbacks') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.churn_callbacks';
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.churn_callbacks ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policy that allows access for service_role (backend operations)
-- This is what your app uses via the Supabase client
CREATE POLICY "churn_callbacks_service_role_access"
ON public.churn_callbacks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 4: Optional - Allow authenticated users who are valid reps
CREATE POLICY "churn_callbacks_rep_access"
ON public.churn_callbacks
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM reps 
        WHERE reps.auth_token = auth.jwt() ->> 'sub'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM reps 
        WHERE reps.auth_token = auth.jwt() ->> 'sub'
    )
);

-- Verify policies
SELECT 
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'churn_callbacks';
