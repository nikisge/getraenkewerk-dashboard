import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { logActivity, getSessionRepId } from "@/features/activity/services/activityLogger";

export type Rep = Tables<"reps">;

export function useReps() {
  return useQuery({
    queryKey: ["reps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reps")
        .select("rep_id, name, telegram_chat_id, telegram_username, is_admin")
        .order("name");
      
      if (error) throw error;
      return data as Rep[];
    },
  });
}

export function useCreateRep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rep: TablesInsert<"reps">) => {
      const { data, error } = await supabase
        .from("reps")
        .insert(rep)
        .select("rep_id, name, telegram_chat_id, telegram_username, is_admin")
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reps"] });
      const repId = getSessionRepId();
      if (repId) logActivity({ repId, actionType: "create", entityType: "rep", entityId: String(data.rep_id) });
    },
  });
}
