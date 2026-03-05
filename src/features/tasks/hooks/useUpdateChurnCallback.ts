import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logActivity, getSessionRepId } from "@/features/activity/services/activityLogger";

export function useUpdateChurnCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
      churnReason,
      note
    }: {
      id: string;
      action: string;
      churnReason?: string;
      note?: string;
    }) => {
      console.log("🔍 Updating churn callback:", { id, action, churnReason, note });

      const updateData: any = { action };

      if (churnReason) {
        updateData.Churn_Grund = churnReason;
      }

      if (note) {
        updateData.note = note;
      }

      console.log("📝 Update data:", updateData);

      const { data, error } = await supabase
        .from("churn_callbacks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("❌ Churn callback update error:", error);
        throw error;
      }

      console.log("✅ Churn callback updated successfully:", data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["rep-completed-activities"] });
      const repId = getSessionRepId();
      if (repId) logActivity({ repId, actionType: "update", entityType: "churn_callback", entityId: variables.id });
    },
  });
}
