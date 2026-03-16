-- Lead Research: Tabellen für Google Maps Lead-Recherche (Getränkewerk)

-- Suchsessions
CREATE TABLE gw_lead_searches (
  id BIGSERIAL PRIMARY KEY,
  rep_id INTEGER NOT NULL REFERENCES reps(rep_id),
  search_term TEXT NOT NULL,
  location TEXT NOT NULL,
  max_results INTEGER,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Einzelne Leads
CREATE TABLE gw_leads (
  id BIGSERIAL PRIMARY KEY,
  search_id BIGINT NOT NULL REFERENCES gw_lead_searches(id),
  place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  rating DECIMAL(2,1),
  rating_count INTEGER,
  category TEXT,
  google_maps_url TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  status TEXT DEFAULT 'neu',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE gw_lead_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_leads ENABLE ROW LEVEL SECURITY;

-- Policies für gw_lead_searches
CREATE POLICY "gw_lead_searches_select" ON gw_lead_searches FOR SELECT USING (true);
CREATE POLICY "gw_lead_searches_insert" ON gw_lead_searches FOR INSERT WITH CHECK (true);
CREATE POLICY "gw_lead_searches_update" ON gw_lead_searches FOR UPDATE USING (true);
CREATE POLICY "gw_lead_searches_delete" ON gw_lead_searches FOR DELETE USING (true);

-- Policies für gw_leads
CREATE POLICY "gw_leads_select" ON gw_leads FOR SELECT USING (true);
CREATE POLICY "gw_leads_insert" ON gw_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "gw_leads_update" ON gw_leads FOR UPDATE USING (true);
CREATE POLICY "gw_leads_delete" ON gw_leads FOR DELETE USING (true);

-- Index für schnelle Suche
CREATE INDEX idx_gw_leads_status ON gw_leads(status);
CREATE INDEX idx_gw_leads_search_id ON gw_leads(search_id);
CREATE INDEX idx_gw_lead_searches_rep_id ON gw_lead_searches(rep_id);
