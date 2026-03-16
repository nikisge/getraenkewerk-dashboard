import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { searchGoogleMaps, mapApifyToLead } from "../services/apifyService";
import { logActivity, getSessionRepId } from "@/features/activity/services/activityLogger";

interface SearchParams {
  searchTerm: string;
  location: string;
  maxResults: number;
  repId: number;
}

export function useApifySearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ searchTerm, location, maxResults, repId }: SearchParams) => {
      // 1. Apify API aufrufen
      const places = await searchGoogleMaps(searchTerm, location, maxResults);

      // 2. lead_searches Record erstellen
      const { data: searchRecord, error: searchError } = await supabase
        .from("gw_lead_searches")
        .insert({
          rep_id: repId,
          search_term: searchTerm,
          location,
          max_results: maxResults,
          result_count: places.length,
        })
        .select()
        .single();

      if (searchError) throw searchError;

      // 3. Leads upserten (Deduplizierung über place_id)
      if (places.length > 0) {
        const leads = places.map((p) => mapApifyToLead(p, searchRecord.id));

        const { error: leadsError } = await supabase
          .from("gw_leads")
          .upsert(leads, { onConflict: "place_id", ignoreDuplicates: true });

        if (leadsError) throw leadsError;
      }

      // 4. Activity Log
      const sessionRepId = getSessionRepId();
      if (sessionRepId) {
        logActivity({
          repId: sessionRepId,
          actionType: "create",
          entityType: "lead_search",
          entityId: String(searchRecord.id),
          details: { searchTerm, location, maxResults, resultCount: places.length },
        });
      }

      return { searchId: searchRecord.id, resultCount: places.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gw_leads"] });
      queryClient.invalidateQueries({ queryKey: ["gw_lead_searches"] });
    },
  });
}
