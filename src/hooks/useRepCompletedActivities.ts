import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompletedActivity {
    id: string;
    timestamp: string;
    customer_name: string;
    campaign_or_type: string;
    action: string;
    note: string | null;
    reason: string | null;
    kunden_nummer: number;
}

export function useRepCompletedActivities(repId: number | null, days: number = 7) {
    return useQuery({
        queryKey: ["rep-completed-activities", repId, days],
        queryFn: async () => {
            if (!repId) return [];

            const dateFilter = new Date();
            dateFilter.setDate(dateFilter.getDate() - days);
            const dateFilterStr = dateFilter.toISOString();

            // Fetch completed campaign tasks for this rep
            const { data: campaignTasks, error: campaignError } = await supabase
                .from("tasks")
                .select(`
          id,
          status,
          last_change,
          notitz_rep,
          failure_reason,
          kunden_nummer,
          campaign_code,
          campaigns:campaign_code (name),
          dim_customers!inner (firma, rep_id)
        `)
                .gte("last_change", dateFilterStr)
                .eq("verified_by_sales", true)
                .eq("dim_customers.rep_id", repId)
                .in("status", ["CLAIMED", "OFFER", "DECLINED"])
                .order("last_change", { ascending: false });

            if (campaignError) {
                console.error("Campaign error:", campaignError);
                throw campaignError;
            }

            // Fetch churn callbacks
            const { data: churnTasks, error: churnError } = await supabase
                .from("churn_callbacks")
                .select(`
          id,
          action,
          created_at,
          note,
          kunden_nummer,
          Churn_Grund,
          dim_customers!inner (firma, rep_id)
        `)
                .gte("created_at", dateFilterStr)
                .eq("dim_customers.rep_id", repId)
                .in("action", ["RETAINED", "LOST"])
                .order("created_at", { ascending: false });

            if (churnError) {
                console.error("Churn error:", churnError);
                // Don't throw, just log - churn tasks are optional
            }

            // Map campaign tasks
            const mappedCampaignTasks: CompletedActivity[] = (campaignTasks || []).map(task => ({
                id: task.id,
                timestamp: task.last_change,
                customer_name: (task.dim_customers as any)?.firma || "Unknown",
                campaign_or_type: (task.campaigns as any)?.name || task.campaign_code || "Campaign",
                action: getActionLabel(task.status),
                note: task.notitz_rep,
                reason: task.failure_reason,
                kunden_nummer: task.kunden_nummer
            }));

            // Map churn tasks
            const mappedChurnTasks: CompletedActivity[] = (churnTasks || []).map(task => ({
                id: task.id,
                timestamp: task.created_at,
                customer_name: (task.dim_customers as any)?.firma || "Unknown",
                campaign_or_type: "Churn Alert",
                action: getActionLabel(task.action),
                note: task.note,
                reason: task.Churn_Grund,
                kunden_nummer: task.kunden_nummer
            }));

            // Merge and sort by timestamp desc
            const allActivities = [...mappedCampaignTasks, ...mappedChurnTasks]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return allActivities;
        },
        enabled: !!repId,
    });
}

function getActionLabel(status: string): string {
    const labels: Record<string, string> = {
        'CLAIMED': 'Kunde sagt hat gekauft',
        'OFFER': 'Angebot abgegeben',
        'DECLINED': 'Angebot abgelehnt',
        'RETAINED': 'Kunde kauft wieder',
        'LOST': 'Kunde verloren'
    };
    return labels[status] || status;
}
