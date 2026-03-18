import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { searchGoogleMapsSmart, mapApifyToLead } from "../services/apifyService";
import { logActivity, getSessionRepId } from "@/features/activity/services/activityLogger";

interface SearchParams {
  searchTerm: string;
  location: string;
  maxResults: number;
  repId: number;
}

// Sammelt alle bekannten Place-IDs aus bisherigen Suchen (gleicher Begriff + Ort)
async function getKnownPlaceIds(searchTerm: string, location: string): Promise<Set<string>> {
  const { data: pastSearches } = await supabase
    .from("gw_lead_searches")
    .select("found_place_ids")
    .ilike("search_term", searchTerm)
    .ilike("location", location);

  const ids = new Set<string>();
  if (pastSearches) {
    for (const s of pastSearches) {
      const placeIds = s.found_place_ids as string[] | null;
      if (placeIds) placeIds.forEach((id) => ids.add(id));
    }
  }
  return ids;
}

export function useApifySearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ searchTerm, location, maxResults, repId }: SearchParams) => {
      // 1. Bekannte Place-IDs laden
      const knownPlaceIds = await getKnownPlaceIds(searchTerm, location);

      // 2. Smarte Suche: holt in Batches, filtert bekannte, holt nach
      const result = await searchGoogleMapsSmart(
        searchTerm,
        location,
        maxResults,
        knownPlaceIds,
      );

      // Alle Place-IDs (neu + bekannte) die in dieser Suche gefunden wurden
      const foundPlaceIds = result.allPlaces
        .map((p) => p.placeId)
        .filter((id): id is string => !!id);

      // 3. Search Record erstellen
      const { data: searchRecord, error: searchError } = await supabase
        .from("gw_lead_searches")
        .insert({
          rep_id: repId,
          search_term: searchTerm,
          location,
          max_results: maxResults,
          result_count: result.allPlaces.length,
          found_place_ids: foundPlaceIds,
        })
        .select()
        .single();

      if (searchError) throw searchError;

      // 4. Nur neue Leads in DB einfügen
      let newLeadsCount = 0;
      if (result.allPlaces.length > 0) {
        const leads = result.allPlaces.map((p) => mapApifyToLead(p, searchRecord.id));

        const { error: leadsError } = await supabase
          .from("gw_leads")
          .upsert(leads, { onConflict: "place_id", ignoreDuplicates: true });

        if (leadsError) throw leadsError;

        // Tatsächlich neue zählen
        const { count } = await supabase
          .from("gw_leads")
          .select("*", { count: "exact", head: true })
          .eq("search_id", searchRecord.id);

        newLeadsCount = count || 0;

        await supabase
          .from("gw_lead_searches")
          .update({ new_leads_count: newLeadsCount })
          .eq("id", searchRecord.id);
      }

      // 5. Activity Log
      const sessionRepId = getSessionRepId();
      if (sessionRepId) {
        logActivity({
          repId: sessionRepId,
          actionType: "create",
          entityType: "lead_search",
          entityId: String(searchRecord.id),
          details: {
            searchTerm,
            location,
            desiredResults: maxResults,
            apiCalls: result.apiCalls,
            totalFound: result.allPlaces.length,
            newLeadsCount,
            knownBefore: knownPlaceIds.size,
            exhausted: result.exhausted,
          },
        });
      }

      return {
        searchId: searchRecord.id,
        resultCount: result.allPlaces.length,
        newLeadsCount,
        apiCalls: result.apiCalls,
        exhausted: result.exhausted,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gw_leads"] });
      queryClient.invalidateQueries({ queryKey: ["gw_lead_searches"] });
    },
  });
}
