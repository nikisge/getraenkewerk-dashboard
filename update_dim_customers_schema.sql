-- Add columns for seasonal and manual purchase intervals
ALTER TABLE dim_customers
ADD COLUMN IF NOT EXISTS season_start text,
ADD COLUMN IF NOT EXISTS season_end text,
ADD COLUMN IF NOT EXISTS seasonal_interval integer,
ADD COLUMN IF NOT EXISTS custom_interval integer;

-- Update the purchase_interval enum to include 'Manual' if it's not already there
-- Note: Supabase/Postgres enums are hard to alter in a single statement if they are used.
-- We might need to just use the text value 'Manual' if the enum allows it, or alter the enum.
-- For now, let's assume we can add 'Manual' to the enum.
ALTER TYPE purchase_interval ADD VALUE IF NOT EXISTS 'Manual';
