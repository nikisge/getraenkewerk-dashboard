import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logActivity, getSessionRepId } from "@/features/activity/services/activityLogger";

export function useUpdateCustomerRep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      kunden_nummer, 
      rep_id 
    }: { 
      kunden_nummer: number; 
      rep_id: number;
    }) => {
      const { data, error } = await supabase
        .from("dim_customers")
        .update({ rep_id })
        .eq("kunden_nummer", kunden_nummer)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard_tasks_admin"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["rep_performance"] });
      const repId = getSessionRepId();
      if (repId) logActivity({ repId, actionType: "update", entityType: "customer", entityId: String(variables.kunden_nummer) });
    },
  });
}
