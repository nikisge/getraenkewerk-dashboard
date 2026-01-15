import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type DashboardTask = Tables<"dashboard_tasks">;

export function useDashboardTasks(repId: number | null | undefined) {
  return useQuery({
    queryKey: ["dashboard_tasks", repId],
    queryFn: async () => {
      if (!repId) return [];

      const { data, error } = await supabase
        .from("dashboard_tasks")
        .select("*")
        .eq("rep_id", repId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as DashboardTask[];
    },
    enabled: !!repId,
  });
}
