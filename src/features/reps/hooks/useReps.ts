import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Rep = Tables<"reps">;

export function useReps() {
  return useQuery({
    queryKey: ["reps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reps")
        .select("*")
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
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reps"] });
    },
  });
}
