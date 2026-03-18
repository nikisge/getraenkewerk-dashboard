-- Speichert die gefundenen Place-IDs pro Suche,
-- damit vergangene Suchen korrekt alle ihre Ergebnisse anzeigen können
-- (auch wenn Leads durch Deduplizierung einer früheren Suche zugeordnet sind)
ALTER TABLE gw_lead_searches ADD COLUMN found_place_ids JSONB DEFAULT '[]';

-- Neue Leads vs. Gesamt: wie viele waren wirklich neu bei dieser Suche
ALTER TABLE gw_lead_searches ADD COLUMN new_leads_count INTEGER DEFAULT 0;
