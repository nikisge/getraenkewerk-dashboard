import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { logActivity, getSessionRepId } from "@/features/activity/services/activityLogger";

export type Campaign = Tables<"campaigns">;

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Campaign[];
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: TablesInsert<"campaigns">) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert(campaign)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      const repId = getSessionRepId();
      if (repId) logActivity({ repId, actionType: "create", entityType: "campaign", entityId: String(data.id) });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Campaign> }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      const repId = getSessionRepId();
      if (repId) logActivity({ repId, actionType: "update", entityType: "campaign", entityId: String(variables.id) });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: { id: number; campaign_code: string }) => {
      // 1. Unberührte Tasks löschen (status = 'NO')
      const { error: tasksError } = await supabase
        .from("tasks")
        .delete()
        .eq("campaign_code", campaign.campaign_code)
        .eq("status", "NO");
      if (tasksError) throw tasksError;

      // 2. Kampagne deaktivieren (Soft Delete)
      const { error } = await supabase
        .from("campaigns")
        .update({ is_active: false })
        .eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const repId = getSessionRepId();
      if (repId) logActivity({ repId, actionType: "delete", entityType: "campaign", entityId: String(variables.id) });
    },
  });
}
