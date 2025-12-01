import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type DashboardTask = Tables<"dashboard_tasks">;

export function useDashboardTasksAdmin() {
  return useQuery({
    queryKey: ["dashboard_tasks_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_tasks")
        .select("*")
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      return data as DashboardTask[];
    },
  });
}
