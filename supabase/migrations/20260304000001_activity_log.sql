CREATE TABLE activity_log (
  id          BIGSERIAL PRIMARY KEY,
  rep_id      INTEGER NOT NULL REFERENCES reps(rep_id),
  action_type TEXT NOT NULL,        -- login, logout, create, update, delete
  entity_type TEXT,                  -- task, customer, campaign, churn_callback, route, route_stop, action, rep
  entity_id   TEXT,                  -- PK des betroffenen Datensatzes (als Text)
  details     JSONB,                 -- Zusatzinfos: Geräte-Info bei Login, geänderte Felder bei Mutations
  user_agent  TEXT,                  -- navigator.userAgent
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_rep_created ON activity_log(rep_id, created_at DESC);
CREATE INDEX idx_activity_log_action_type ON activity_log(action_type);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_activity" ON activity_log FOR INSERT WITH CHECK (true);
CREATE POLICY "read_activity" ON activity_log FOR SELECT USING (true);
