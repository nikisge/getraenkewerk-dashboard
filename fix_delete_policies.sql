-- Allow public delete access to actions (for custom auth)
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.actions;
CREATE POLICY "Allow public delete"
ON public.actions
FOR DELETE
TO public
USING (true);

-- Allow public delete access to campaigns (for custom auth)
CREATE POLICY "Allow public delete campaigns"
ON public.campaigns
FOR DELETE
TO public
USING (true);
