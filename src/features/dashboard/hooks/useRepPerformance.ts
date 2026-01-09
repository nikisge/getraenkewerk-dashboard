import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RepPerformance = {
  rep_id: number;
  name: string;
  total_tasks: number;
  completed_tasks: number;
  open_tasks: number;
  pending_tasks: number;
  completion_rate: number;
  assigned_customers: number;
  active_customers: number;
  at_risk_customers: number;
  tasks_per_day_30d: number;
  tasks_per_day_7d: number;
};

export function useRepPerformance() {
  return useQuery({
    queryKey: ["rep-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rep_performance")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as RepPerformance[];
    },
  });
}

export function useRepPerformanceById(repId: number | null) {
  return useQuery({
    queryKey: ["rep-performance", repId],
    queryFn: async () => {
      if (!repId) return null;
      
      const { data, error } = await supabase
        .from("rep_performance")
        .select("*")
        .eq("rep_id", repId)
        .single();
      
      if (error) throw error;
      return data as RepPerformance;
    },
    enabled: !!repId,
  });
}
