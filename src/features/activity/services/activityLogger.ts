import { supabase } from "@/integrations/supabase/client";

const SESSION_REP_KEY = "activity_log_rep_id";

interface LogActivityParams {
  repId: number;
  actionType: "login" | "logout" | "session_timeout" | "create" | "update" | "delete";
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export function setSessionRepId(repId: number) {
  sessionStorage.setItem(SESSION_REP_KEY, String(repId));
}

export function clearSessionRepId() {
  sessionStorage.removeItem(SESSION_REP_KEY);
}

export function getSessionRepId(): number | null {
  const val = sessionStorage.getItem(SESSION_REP_KEY);
  return val ? Number(val) : null;
}

export function logActivity({ repId, actionType, entityType, entityId, details }: LogActivityParams) {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

  // Fire-and-forget — never block the caller
  supabase
    .from("ActivityLog_getraenke")
    .insert({
      rep_id: repId,
      action_type: actionType,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      details: details ?? null,
      user_agent: userAgent,
    })
    .then(({ error }) => {
      if (error) console.error("Activity log error:", error);
    });
}
