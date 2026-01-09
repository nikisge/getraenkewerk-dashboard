import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard_tasks_admin"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["rep_performance"] });
    },
  });
}
