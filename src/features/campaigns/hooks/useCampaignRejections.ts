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

      // Get campaign tasks from the tasks table
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, kunden_nummer, status, failure_reason, notitz_rep, last_change")
        .eq("campaign_code", campaignCode)
        .not("status", "is", null);

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) return [];

      // Get customer data for these tasks
      const kundenNummern = [...new Set(tasks.map(t => t.kunden_nummer))];
      const { data: customers, error: customersError } = await supabase
        .from("dim_customers")
        .select("kunden_nummer, firma, ort, rep_id")
        .in("kunden_nummer", kundenNummern);

      if (customersError) throw customersError;

      // Create customer lookup map
      const customerMap = new Map(
        (customers || []).map(c => [c.kunden_nummer, c])
      );

      // Get rep names
      const repIds = [...new Set((customers || []).map(c => c.rep_id).filter(Boolean))];
      let repMap = new Map<number, string>();

      if (repIds.length > 0) {
        const { data: reps } = await supabase
          .from("reps")
          .select("rep_id, name")
          .in("rep_id", repIds);

        repMap = new Map((reps || []).map(r => [r.rep_id, r.name]));
      }

      // Map results
      let results = tasks.map((task) => {
        const customer = customerMap.get(task.kunden_nummer);
        return {
          task_id: task.id,
          kunden_nummer: task.kunden_nummer,
          firma: customer?.firma || "-",
          ort: customer?.ort || null,
          status: task.status,
          failure_reason: task.failure_reason,
          notitz_rep: task.notitz_rep,
          last_change: task.last_change,
          rep_name: customer?.rep_id ? repMap.get(customer.rep_id) || null : null,
          rep_id: customer?.rep_id || null,
        };
      }) as CampaignResult[];

      // Filter by rep_id if provided
      if (repId !== undefined && repId !== null) {
        results = results.filter(r => r.rep_id === repId);
      }

      return results;
    },
    enabled: !!campaignCode,
  });
}
