import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Lead = Tables<"gw_leads">;

export type LeadStatus = "neu" | "kontaktiert" | "kein_interesse" | "kunde";

export interface LeadFilters {
  searchTerm?: string;
  status?: LeadStatus | null;
  placeIds?: string[] | null;
  plz?: string;
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: ["gw_leads", filters],
    queryFn: async () => {
      let query = supabase
        .from("gw_leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.placeIds && filters.placeIds.length > 0) {
        query = query.in("place_id", filters.placeIds);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.searchTerm?.trim()) {
        query = query.or(
          `name.ilike.%${filters.searchTerm.trim()}%,address.ilike.%${filters.searchTerm.trim()}%`
        );
      }
      if (filters.plz?.trim()) {
        query = query.ilike("plz", `${filters.plz.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
    enabled: filters.placeIds === undefined || (filters.placeIds !== null && filters.placeIds.length > 0),
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      status,
    }: {
      leadId: number;
      status: LeadStatus;
    }) => {
      const { data, error } = await supabase
        .from("gw_leads")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gw_leads"] });
    },
  });
}

export function useUpdateLeadNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      notes,
    }: {
      leadId: number;
      notes: string;
    }) => {
      const { data, error } = await supabase
        .from("gw_leads")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("id", leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gw_leads"] });
    },
  });
}
