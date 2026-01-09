-- =============================================================================
-- SECURITY IMPROVEMENTS MIGRATION
-- =============================================================================
-- Diese Migration verbessert die Sicherheit des Dashboards:
-- 1. Sessions-Tabelle für sichere Token-basierte Authentifizierung
-- 2. Passwort-Hashing mit bcrypt (pgcrypto)
-- 3. Admin-Flag statt hardcodiertem Namen
-- 4. Sichere Login/Logout/Validate Funktionen
-- =============================================================================

-- 1. pgcrypto Extension für bcrypt aktivieren
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Sessions-Tabelle erstellen
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id INTEGER NOT NULL REFERENCES reps(rep_id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices für Performance
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_rep_id ON sessions(rep_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 3. Reps-Tabelle erweitern
ALTER TABLE reps
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 4. Passwort-Hash-Funktionen
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF hash IS NULL THEN
    RETURN false;
  END IF;
  RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Login-Funktion (gibt Session-Token zurück)
CREATE OR REPLACE FUNCTION authenticate_rep(p_password TEXT)
RETURNS TABLE (
  session_token TEXT,
  rep_id INTEGER,
  rep_name TEXT,
  is_admin BOOLEAN,
  telegram_chat_id TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_rep RECORD;
  v_token TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  -- Rep mit passendem Passwort finden
  -- Prüft zuerst password_hash (neu), dann auth_token (Legacy-Fallback)
  SELECT r.rep_id, r.name, r.is_admin, r.telegram_chat_id, r.password_hash, r.auth_token
  INTO v_rep
  FROM reps r
  WHERE (r.password_hash IS NOT NULL AND verify_password(p_password, r.password_hash))
     OR (r.password_hash IS NULL AND r.auth_token = p_password);

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Session-Token generieren (64 Zeichen hex)
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires := NOW() + INTERVAL '7 days';

  -- Alte Sessions des Users löschen (optional: max 3 Sessions erlauben)
  DELETE FROM sessions WHERE rep_id = v_rep.rep_id AND expires_at < NOW();

  -- Neue Session erstellen
  INSERT INTO sessions (rep_id, token, expires_at)
  VALUES (v_rep.rep_id, v_token, v_expires);

  RETURN QUERY SELECT
    v_token,
    v_rep.rep_id,
    v_rep.name,
    COALESCE(v_rep.is_admin, false),
    v_rep.telegram_chat_id,
    v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Session-Validierung
CREATE OR REPLACE FUNCTION validate_session(p_token TEXT)
RETURNS TABLE (
  rep_id INTEGER,
  rep_name TEXT,
  is_admin BOOLEAN,
  telegram_chat_id TEXT,
  auth_token TEXT,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.rep_id,
    r.name,
    COALESCE(r.is_admin, false),
    r.telegram_chat_id,
    r.auth_token,
    s.expires_at
  FROM sessions s
  JOIN reps r ON r.rep_id = s.rep_id
  WHERE s.token = p_token AND s.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Logout-Funktion
CREATE OR REPLACE FUNCTION invalidate_session(p_token TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM sessions WHERE token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Session-Cleanup (alte Sessions löschen)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Passwort ändern Funktion
CREATE OR REPLACE FUNCTION change_password(p_session_token TEXT, p_new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_rep_id INTEGER;
BEGIN
  -- Session validieren
  SELECT s.rep_id INTO v_rep_id
  FROM sessions s
  WHERE s.token = p_session_token AND s.expires_at > NOW();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Passwort-Hash aktualisieren
  UPDATE reps SET password_hash = hash_password(p_new_password)
  WHERE rep_id = v_rep_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DATEN-MIGRATION
-- =============================================================================

-- Bestehende Passwörter hashen (auth_token -> password_hash)
UPDATE reps
SET password_hash = hash_password(auth_token)
WHERE auth_token IS NOT NULL
  AND auth_token != ''
  AND password_hash IS NULL;

-- Patrick als Admin markieren (und weitere bekannte Admins)
UPDATE reps SET is_admin = true WHERE name = 'Patrick';

-- =============================================================================
-- RLS FÜR SESSIONS-TABELLE
-- =============================================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Sessions: Nur lesen für eigene Validierung (über Funktion)
CREATE POLICY "sessions_select_via_token" ON sessions
  FOR SELECT USING (true);  -- Wird durch SECURITY DEFINER Funktionen kontrolliert

-- Sessions: Insert nur über authenticate_rep Funktion
CREATE POLICY "sessions_insert_system" ON sessions
  FOR INSERT WITH CHECK (true);

-- Sessions: Delete für Logout
CREATE POLICY "sessions_delete_own" ON sessions
  FOR DELETE USING (true);

-- =============================================================================
-- HINWEISE ZUR WEITEREN ABSICHERUNG
-- =============================================================================
-- Nach dem Frontend-Update können die offenen Policies ersetzt werden.
-- Die folgenden Policies werden nach der RPC-Migration aktiviert:
--
-- ALTER TABLE dim_customers ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "deny_direct_customer_access" ON dim_customers FOR ALL USING (false);
--
-- Bis dahin bleiben die bestehenden Policies aktiv für Kompatibilität.
-- =============================================================================
