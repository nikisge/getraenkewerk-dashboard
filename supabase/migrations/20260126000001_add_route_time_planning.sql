-- Migration: Zeitplanung für Routen
-- Ermöglicht Außendienstlern eine Startzeit einzugeben und Ankunftszeiten zu sehen

-- Neue Felder für routes Tabelle
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS default_visit_duration INTEGER DEFAULT 20;

-- Kommentare zur Dokumentation
COMMENT ON COLUMN routes.start_time IS 'Geplante Startzeit der Route (z.B. 08:00)';
COMMENT ON COLUMN routes.default_visit_duration IS 'Standard-Aufenthaltsdauer pro Kunde in Minuten';
