-- Enable public read access for campaigns
CREATE POLICY "Public read access for campaigns"
ON public.campaigns
FOR SELECT
USING (true);

-- Enable public read access for reps
CREATE POLICY "Public read access for reps"
ON public.reps
FOR SELECT
USING (true);

-- Enable public read access for tasks
CREATE POLICY "Public read access for tasks"
ON public.tasks
FOR SELECT
USING (true);

-- Enable public read access for dim_customers
CREATE POLICY "Public read access for dim_customers"
ON public.dim_customers
FOR SELECT
USING (true);