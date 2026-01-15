-- Add latitude and longitude columns to dim_customers for map display
ALTER TABLE dim_customers
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for faster geo queries
CREATE INDEX IF NOT EXISTS idx_customers_coordinates
ON dim_customers (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add planned_arrival and visit_duration to route_stops for time planning
ALTER TABLE route_stops
ADD COLUMN IF NOT EXISTS planned_arrival TIME,
ADD COLUMN IF NOT EXISTS visit_duration_minutes INTEGER DEFAULT 30;

COMMENT ON COLUMN dim_customers.latitude IS 'GPS latitude from geocoded address';
COMMENT ON COLUMN dim_customers.longitude IS 'GPS longitude from geocoded address';
COMMENT ON COLUMN route_stops.planned_arrival IS 'Planned arrival time at this stop';
COMMENT ON COLUMN route_stops.visit_duration_minutes IS 'Expected visit duration in minutes';
