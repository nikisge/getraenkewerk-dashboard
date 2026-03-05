import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLogFilters {
  repId?: number | null;
  actionType?: string | null;
  entityType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface ActivityLogEntry {
  id: number;
  rep_id: number;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  user_agent: string | null;
  created_at: string;
}

export interface ActivityLogResult {
  entries: ActivityLogEntry[];
  totalCount: number;
}

export function useActivityLog(
  filters: ActivityLogFilters = {},
  page: number = 0,
  pageSize: number = 50
) {
  return useQuery({
    queryKey: ["activity_log", filters, page, pageSize],
    queryFn: async (): Promise<ActivityLogResult> => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("activity_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filters.repId) {
        query = query.eq("rep_id", filters.repId);
      }
      if (filters.actionType) {
        query = query.eq("action_type", filters.actionType);
      }
      if (filters.entityType) {
        query = query.eq("entity_type", filters.entityType);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        // Add a day to include the full end date
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt("created_at", endDate.toISOString());
      }

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        entries: (data ?? []) as ActivityLogEntry[],
        totalCount: count ?? 0,
      };
    },
  });
}
