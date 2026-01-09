import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VerificationFailedTask {
  task_id: string;
  kunden_nummer: number;
  campaign_code: string;
  campaign_name: string;
  firma: string;
  ort: string | null;
  claimed_at: string;
  rep_id: number;
  rep_name: string;
}

export function useVerificationFailedTasks() {
  return useQuery({
    queryKey: ["verification_failed_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          kunden_nummer,
          campaign_code,
          claimed_at,
          dim_customers!inner (
            firma,
            ort,
            rep_id,
            reps!inner (
              name
            )
          ),
          campaigns!inner (
            name
          )
        `)
        .eq("verification_failed", true)
        .eq("status", "LIE");

      if (error) throw error;

      // Transform the data to a flat structure
      return (data || []).map((task: any) => ({
        task_id: task.id,
        kunden_nummer: task.kunden_nummer,
        campaign_code: task.campaign_code,
        campaign_name: task.campaigns?.name || task.campaign_code,
        firma: task.dim_customers?.firma || "Unbekannt",
        ort: task.dim_customers?.ort || null,
        claimed_at: task.claimed_at,
        rep_id: task.dim_customers?.rep_id,
        rep_name: task.dim_customers?.reps?.name || "Unbekannt",
      })) as VerificationFailedTask[];
    },
  });
}
