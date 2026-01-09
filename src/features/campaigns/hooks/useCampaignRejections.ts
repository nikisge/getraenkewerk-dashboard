import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignRejection {
  task_id: string;
  kunden_nummer: number;
  firma: string;
  ort: string | null;
  failure_reason: string | null;
  notitz_rep: string | null;
  last_change: string | null;
  rep_name: string | null;
  rep_id: number | null;
  status: string | null;
}

export interface CampaignRejectionFilters {
  campaignCode: string | null;
  repId?: number | null;
}

export function useCampaignRejections(filters: CampaignRejectionFilters) {
  const { campaignCode, repId } = filters;

  return useQuery({
    queryKey: ["campaign_rejections", campaignCode, repId],
    queryFn: async () => {
      if (!campaignCode) return [];

      let query = supabase
        .from("campaign_rejection_details" as any)
        .select("*")
        .eq("campaign_code", campaignCode);

      // Filter by rep_id if provided (for field reps to see only their customers)
      if (repId !== undefined && repId !== null) {
        query = query.eq("rep_id", repId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as CampaignRejection[];
    },
    enabled: !!campaignCode,
  });
}

// Hook to get all campaign results (not just rejections) for a campaign
export interface CampaignResult {
  task_id: string;
  kunden_nummer: number;
  firma: string;
  ort: string | null;
  status: string | null;
  failure_reason: string | null;
  notitz_rep: string | null;
  last_change: string | null;
  rep_name: string | null;
  rep_id: number | null;
}

export function useCampaignResults(campaignCode: string | null, repId?: number | null) {
  return useQuery({
    queryKey: ["campaign_results", campaignCode, repId],
    queryFn: async () => {
      if (!campaignCode) return [];

      // Query promo_tasks directly to get all statuses
      let query = supabase
        .from("promo_tasks")
        .select(`
          id,
          kunden_nummer,
          status,
          failure_reason,
          notitz_rep,
          last_change,
          dim_customers!inner(firma, ort, rep_id),
          reps(name)
        `)
        .eq("campaign_code", campaignCode)
        .not("status", "is", null); // Only tasks with a status (processed)

      const { data, error } = await query;

      if (error) throw error;

      // Map and filter the results
      let results = (data || []).map((task: any) => ({
        task_id: task.id,
        kunden_nummer: task.kunden_nummer,
        firma: task.dim_customers?.firma || "-",
        ort: task.dim_customers?.ort || null,
        status: task.status,
        failure_reason: task.failure_reason,
        notitz_rep: task.notitz_rep,
        last_change: task.last_change,
        rep_name: task.reps?.name || null,
        rep_id: task.dim_customers?.rep_id || null,
      })) as CampaignResult[];

      // Filter by rep_id if provided
      if (repId !== undefined && repId !== null) {
        results = results.filter(r => r.rep_id === repId);
      }

      return results;
    },
    enabled: !!campaignCode,
  });
}
