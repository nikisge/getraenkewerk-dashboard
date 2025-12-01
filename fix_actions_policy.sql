-- Enable RLS on the table (if not already enabled)
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to insert new actions
CREATE POLICY "Allow authenticated insert"
ON public.actions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy to allow authenticated users to view all actions
CREATE POLICY "Allow authenticated select"
ON public.actions
FOR SELECT
TO authenticated
USING (true);

-- Policy to allow authenticated users to update actions (optional)
CREATE POLICY "Allow authenticated update"
ON public.actions
FOR UPDATE
TO authenticated
USING (true);
