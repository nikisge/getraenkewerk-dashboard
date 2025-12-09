import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type DashboardTask = Tables<"dashboard_tasks">;

export function useDashboardTasks(authToken: string | null | undefined) {
  return useQuery({
    queryKey: ["dashboard_tasks", authToken],
    queryFn: async () => {
      if (!authToken) return [];

      const { data, error } = await supabase
        .from("dashboard_tasks")
        .select("*")
        .eq("auth_token", authToken)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as DashboardTask[];
    },
    enabled: !!authToken,
  });
}
