-- Since we are using custom auth and not Supabase Auth, we need to allow 'public' (anon) access.

-- 1. Fix Storage Policies (Allow public uploads)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK ( bucket_id = 'action-images' );

-- 2. Fix Table Policies (Allow public inserts)
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.actions;
CREATE POLICY "Allow public insert"
ON public.actions
FOR INSERT
TO public
WITH CHECK (true);

-- 3. Fix Table Policies (Allow public select)
DROP POLICY IF EXISTS "Allow authenticated select" ON public.actions;
CREATE POLICY "Allow public select"
ON public.actions
FOR SELECT
TO public
USING (true);
