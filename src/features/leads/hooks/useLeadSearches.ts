import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type LeadSearch = Tables<"gw_lead_searches">;

export function useLeadSearches(repId?: number) {
  return useQuery({
    queryKey: ["gw_lead_searches", repId],
    queryFn: async () => {
      let query = supabase
        .from("gw_lead_searches")
        .select("*")
        .order("created_at", { ascending: false });

      if (repId) {
        query = query.eq("rep_id", repId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LeadSearch[];
    },
  });
}
