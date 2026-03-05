CREATE TABLE "ActivityLog_getraenke" (
  id          BIGSERIAL PRIMARY KEY,
  rep_id      INTEGER NOT NULL REFERENCES reps(rep_id),
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     JSONB,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activitylog_getraenke_rep_created ON "ActivityLog_getraenke"(rep_id, created_at DESC);
CREATE INDEX idx_activitylog_getraenke_action_type ON "ActivityLog_getraenke"(action_type);

ALTER TABLE "ActivityLog_getraenke" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_activity" ON "ActivityLog_getraenke" FOR INSERT WITH CHECK (true);
CREATE POLICY "read_activity" ON "ActivityLog_getraenke" FOR SELECT USING (true);
