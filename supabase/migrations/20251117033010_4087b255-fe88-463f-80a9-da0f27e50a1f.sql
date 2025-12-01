-- Add public INSERT, UPDATE, DELETE policies for reps table
CREATE POLICY "Public insert access for reps"
ON public.reps
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public update access for reps"
ON public.reps
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete access for reps"
ON public.reps
FOR DELETE
TO public
USING (true);

-- Add public INSERT, UPDATE, DELETE policies for campaigns table
CREATE POLICY "Public insert access for campaigns"
ON public.campaigns
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public update access for campaigns"
ON public.campaigns
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete access for campaigns"
ON public.campaigns
FOR DELETE
TO public
USING (true);

-- Add public INSERT, UPDATE, DELETE policies for dim_customers table
CREATE POLICY "Public insert access for dim_customers"
ON public.dim_customers
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public update access for dim_customers"
ON public.dim_customers
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete access for dim_customers"
ON public.dim_customers
FOR DELETE
TO public
USING (true);

-- Add public INSERT, UPDATE, DELETE policies for tasks table
CREATE POLICY "Public insert access for tasks"
ON public.tasks
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public update access for tasks"
ON public.tasks
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete access for tasks"
ON public.tasks
FOR DELETE
TO public
USING (true);