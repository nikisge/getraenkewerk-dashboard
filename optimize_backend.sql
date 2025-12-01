-- Add indexes to 'actions' table for common query patterns
CREATE INDEX IF NOT EXISTS idx_actions_promo_dates ON public.actions (promo_from, promo_to);
CREATE INDEX IF NOT EXISTS idx_actions_product_name ON public.actions (product_name);
CREATE INDEX IF NOT EXISTS idx_actions_created_at ON public.actions (created_at DESC);

-- Add indexes to 'campaigns' table
CREATE INDEX IF NOT EXISTS idx_campaigns_active_dates ON public.campaigns (active_from, active_to);
CREATE INDEX IF NOT EXISTS idx_campaigns_code ON public.campaigns (campaign_code);
CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON public.campaigns (is_active);

-- Add indexes to 'dim_customers' table for lookups
CREATE INDEX IF NOT EXISTS idx_customers_kunden_nummer ON public.dim_customers (kunden_nummer);
CREATE INDEX IF NOT EXISTS idx_customers_rep_id ON public.dim_customers (rep_id);
CREATE INDEX IF NOT EXISTS idx_customers_status_active ON public.dim_customers (status_active);

-- Add indexes to 'tasks' table
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_kunden_nummer ON public.tasks (kunden_nummer);
CREATE INDEX IF NOT EXISTS idx_tasks_campaign_code ON public.tasks (campaign_code);

-- Analyze tables to update statistics
ANALYZE public.actions;
ANALYZE public.campaigns;
ANALYZE public.dim_customers;
ANALYZE public.tasks;
