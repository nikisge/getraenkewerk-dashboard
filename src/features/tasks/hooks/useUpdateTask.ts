import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type TaskUpdate = Partial<Tables<"tasks">>;

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates
    }: {
      id: string;
      updates: TaskUpdate
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      queryClient.invalidateQueries({ queryKey: ["rep-performance"] });
      queryClient.invalidateQueries({ queryKey: ["rep-completed-activities"] });
      queryClient.invalidateQueries({ queryKey: ["campaign_results"] });
      queryClient.invalidateQueries({ queryKey: ["campaign_rejections"] });
    },
  });
}
