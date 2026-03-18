-- Lead-Runden Feature: Schema-Erweiterungen
-- 1. PLZ-Spalte für Leads (Extraktion aus Adresse)
ALTER TABLE gw_leads ADD COLUMN IF NOT EXISTS plz TEXT;
CREATE INDEX IF NOT EXISTS idx_gw_leads_plz ON gw_leads(plz);

-- Backfill: PLZ aus Adresse extrahieren (deutsches Format: "Straße Nr, XXXXX Ort")
UPDATE gw_leads SET plz = (regexp_match(address, '(\d{5})'))[1]
  WHERE address IS NOT NULL AND plz IS NULL;

-- 2. Route-Typ: 'standard' (Kunden-Route) oder 'lead' (Lead-Runde)
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_type TEXT NOT NULL DEFAULT 'standard';

-- 3. route_stops: Lead-Support + Besuchs-Tracking
-- kunden_nummer nullable machen (Lead-Stops haben keine Kundennummer)
ALTER TABLE route_stops ALTER COLUMN kunden_nummer DROP NOT NULL;

-- Lead-Referenz
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS lead_id BIGINT REFERENCES gw_leads(id);

-- Besuchs-Zeitstempel
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS visited_at TIMESTAMPTZ;

-- Constraint: Ein Stop muss entweder einen Kunden ODER einen Lead haben
ALTER TABLE route_stops ADD CONSTRAINT chk_stop_type
  CHECK (kunden_nummer IS NOT NULL OR lead_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_route_stops_lead_id ON route_stops(lead_id);
