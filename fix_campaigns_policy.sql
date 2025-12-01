-- Allow public read access to campaigns (for custom auth)
DROP POLICY IF EXISTS "Allow authenticated select" ON public.campaigns;
CREATE POLICY "Allow public select"
ON public.campaigns
FOR SELECT
TO public
USING (true);

-- Ensure RLS is enabled (good practice, though we are opening it up for custom auth)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
