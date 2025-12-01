import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Customer = Tables<"dim_customers">;

export function useCustomers(searchTerm: string = "") {
  return useQuery({
    queryKey: ["customers", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("dim_customers")
        .select("*")
        .order("firma");
      
      if (searchTerm) {
        const trimmedSearch = searchTerm.trim();
        // Search by company name (firma)
        query = query.ilike("firma", `%${trimmedSearch}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      kunden_nummer, 
      updates 
    }: { 
      kunden_nummer: number; 
      updates: Partial<Customer> 
    }) => {
      const { data, error } = await supabase
        .from("dim_customers")
        .update(updates)
        .eq("kunden_nummer", kunden_nummer)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (customer: TablesInsert<"dim_customers">) => {
      const { data, error } = await supabase
        .from("dim_customers")
        .insert(customer)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
