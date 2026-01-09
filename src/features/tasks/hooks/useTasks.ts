import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TaskWithCustomer = {
  id: string;
  status: string;
  campaign_code: string | null;
  next_check_date: string | null;
  last_change: string | null;
  note: string | null;
  adaption_state: string | null;
  customer: {
    kunden_nummer: number;
    firma: string | null;
    email: string | null;
  } | null;
};

export function useRepTasks(repId: number | null) {
  return useQuery({
    queryKey: ["tasks", repId],
    queryFn: async () => {
      if (!repId) return [];

      const { data, error } = await supabase
        .from("dashboard_tasks")
        .select("*")
        .eq("rep_id", repId);

      if (error) throw error;

      // Map dashboard_tasks view to TaskWithCustomer structure for compatibility
      return data.map(task => ({
        id: task.task_id,
        status: task.status,
        campaign_code: task.campaign_code,
        next_check_date: task.next_check_date, // Now available in view
        last_change: task.last_change,
        note: task.note,
        adaption_state: task.adaption_state, // Now available in view
        customer: {
          kunden_nummer: task.kunden_nummer,
          firma: task.firma,
          email: null, // Not in view, but maybe not needed for list
          rep_id: task.rep_id
        }
      })) as TaskWithCustomer[];
    },
    enabled: !!repId,
  });
}

export function useTaskStats(repId: number | null) {
  return useQuery({
    queryKey: ["task-stats", repId],
    queryFn: async () => {
      if (!repId) return { total: 0, completed: 0 };

      const { data, error } = await supabase
        .from("dashboard_tasks")
        .select("status")
        .eq("rep_id", repId);

      if (error) throw error;

      const total = data.length;
      // In the new view logic, completed tasks are filtered out, so "completed" might always be 0 
      // unless we want to count "Offers" as completed? 
      // For now, let's count "YES" if they somehow appear, or maybe we want to count "Offers"?
      // The user wants to see "Active" tasks.
      const completed = data.filter((t) => t.status === "YES").length;

      return { total, completed };
    },
    enabled: !!repId,
  });
}
