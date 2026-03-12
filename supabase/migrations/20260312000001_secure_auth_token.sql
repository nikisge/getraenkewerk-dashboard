-- =============================================================================
-- Getränkewerk: auth_token vor öffentlichem Lesen schützen
-- ACHTUNG: Auf dieser Datenbank laufen mehrere Dashboards.
-- Diese Migration prüft zuerst den Ist-Zustand und macht nichts kaputt.
-- =============================================================================

-- ===== SCHRITT 1: Diagnose — was existiert bereits? =====
-- Gibt alle bestehenden Funktionen, Policies und Grants aus.
-- Ergebnis im "Messages"-Tab des SQL Editors sichtbar.
DO $$
DECLARE
  rec RECORD;
  func_exists BOOLEAN;
BEGIN
  -- Prüfe ob verify_auth_token schon existiert
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'verify_auth_token'
  ) INTO func_exists;

  IF func_exists THEN
    RAISE NOTICE '⚠️  Funktion "verify_auth_token" existiert bereits — wird mit CREATE OR REPLACE aktualisiert';
  ELSE
    RAISE NOTICE '✅ Funktion "verify_auth_token" existiert noch nicht — wird neu erstellt';
  END IF;

  -- Alle bestehenden Policies auf reps auflisten
  RAISE NOTICE '';
  RAISE NOTICE '📋 Bestehende RLS-Policies auf "reps":';
  FOR rec IN
    SELECT policyname, cmd, permissive, roles, qual
    FROM pg_policies WHERE tablename = 'reps'
  LOOP
    RAISE NOTICE '   - "%"  (% / %)  Rollen: %', rec.policyname, rec.cmd, rec.permissive, rec.roles;
  END LOOP;

  -- Bestehende Column-Privileges auf reps prüfen
  RAISE NOTICE '';
  RAISE NOTICE '📋 Bestehende Column-Privileges auf "reps" für anon:';
  FOR rec IN
    SELECT column_name, privilege_type
    FROM information_schema.column_privileges
    WHERE table_name = 'reps' AND grantee = 'anon' AND privilege_type = 'SELECT'
  LOOP
    RAISE NOTICE '   - % (%)', rec.column_name, rec.privilege_type;
  END LOOP;

  -- Prüfe ob table-level SELECT für anon existiert
  IF EXISTS (
    SELECT 1 FROM information_schema.table_privileges
    WHERE table_name = 'reps' AND grantee = 'anon' AND privilege_type = 'SELECT'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  anon hat table-level SELECT auf "reps" (alle Spalten inkl. auth_token lesbar)';
  END IF;
END $$;


-- ===== SCHRITT 2: RPC-Funktion erstellen =====
-- Sichere Login-Funktion: SECURITY DEFINER darf auth_token lesen,
-- der anon-User kann es später nicht mehr direkt.
-- CREATE OR REPLACE ist sicher — falls die Funktion schon existiert,
-- wird sie nur aktualisiert (gleiche Signatur).
CREATE OR REPLACE FUNCTION verify_auth_token(p_token TEXT)
RETURNS TABLE (
  rep_id INTEGER,
  name TEXT,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  is_admin BOOLEAN,
  auth_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT r.rep_id, r.name::TEXT, r.telegram_chat_id::TEXT, r.telegram_username::TEXT, r.is_admin, r.auth_token::TEXT
  FROM reps r
  WHERE r.auth_token = p_token;
END;
$$;


-- ===== SCHRITT 3: Column-Level Security =====
-- auth_token und password_hash für anon und authenticated sperren.
-- Nur die Spalten freigeben, die die Dashboards tatsächlich brauchen.
--
-- WICHTIG: Wird nur ausgeführt, wenn anon aktuell table-level SELECT hat.
-- Falls bereits column-level Grants bestehen, wird nichts geändert.
DO $$
BEGIN
  -- Nur eingreifen wenn table-level SELECT existiert (= alles offen)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_privileges
    WHERE table_name = 'reps' AND grantee = 'anon' AND privilege_type = 'SELECT'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Schränke SELECT auf "reps" ein — auth_token + password_hash werden gesperrt...';

    -- Table-level SELECT entziehen
    REVOKE SELECT ON reps FROM anon;
    -- Nur sichere Spalten freigeben
    GRANT SELECT (rep_id, name, telegram_chat_id, telegram_username, is_admin) ON reps TO anon;

    RAISE NOTICE '✅ anon: auth_token + password_hash nicht mehr lesbar';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'ℹ️  anon hat bereits eingeschränkten SELECT — keine Änderung nötig';
  END IF;

  -- Gleiche Prüfung für authenticated
  IF EXISTS (
    SELECT 1 FROM information_schema.table_privileges
    WHERE table_name = 'reps' AND grantee = 'authenticated' AND privilege_type = 'SELECT'
  ) THEN
    REVOKE SELECT ON reps FROM authenticated;
    GRANT SELECT (rep_id, name, telegram_chat_id, telegram_username, is_admin) ON reps TO authenticated;

    RAISE NOTICE '✅ authenticated: auth_token + password_hash nicht mehr lesbar';
  ELSE
    RAISE NOTICE 'ℹ️  authenticated hat bereits eingeschränkten SELECT — keine Änderung nötig';
  END IF;
END $$;


-- ===== SCHRITT 4: Ergebnis-Check =====
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========== ERGEBNIS ==========';

  -- Funktion prüfen
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'verify_auth_token') THEN
    RAISE NOTICE '✅ verify_auth_token RPC-Funktion aktiv';
  ELSE
    RAISE NOTICE '❌ verify_auth_token FEHLT — Login wird nicht funktionieren!';
  END IF;

  -- Column-Privileges nach Änderung
  RAISE NOTICE '';
  RAISE NOTICE '📋 Aktuelle Column-Privileges für anon auf "reps":';
  FOR rec IN
    SELECT column_name FROM information_schema.column_privileges
    WHERE table_name = 'reps' AND grantee = 'anon' AND privilege_type = 'SELECT'
    ORDER BY column_name
  LOOP
    RAISE NOTICE '   ✅ %', rec.column_name;
  END LOOP;

  -- Prüfe ob auth_token noch lesbar ist
  IF EXISTS (
    SELECT 1 FROM information_schema.column_privileges
    WHERE table_name = 'reps' AND grantee = 'anon'
      AND privilege_type = 'SELECT' AND column_name = 'auth_token'
  ) THEN
    RAISE NOTICE '   ⚠️  auth_token ist noch lesbar!';
  ELSE
    RAISE NOTICE '   🔒 auth_token gesperrt';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.column_privileges
    WHERE table_name = 'reps' AND grantee = 'anon'
      AND privilege_type = 'SELECT' AND column_name = 'password_hash'
  ) THEN
    RAISE NOTICE '   ⚠️  password_hash ist noch lesbar!';
  ELSE
    RAISE NOTICE '   🔒 password_hash gesperrt';
  END IF;

  RAISE NOTICE '==============================';
END $$;
