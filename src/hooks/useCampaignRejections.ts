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
}

export function useCampaignRejections(campaignCode: string | null) {
  return useQuery({
    queryKey: ["campaign_rejections", campaignCode],
    queryFn: async () => {
      if (!campaignCode) return [];

      const { data, error } = await supabase
        .from("campaign_rejection_details" as any)
        .select("*")
        .eq("campaign_code", campaignCode);

      if (error) throw error;

      return (data || []) as CampaignRejection[];
    },
    enabled: !!campaignCode,
  });
}
