import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Customer } from "./useCustomers";

export type Route = Tables<"routes">;
export type RouteStop = Tables<"route_stops">;

export interface RouteStopWithCustomer extends RouteStop {
    customer: Customer;
}

export interface RouteWithStops extends Route {
    stops: RouteStopWithCustomer[];
}

// Get all routes for a rep
export function useRoutes(repId: number | undefined) {
    return useQuery({
        queryKey: ["routes", repId],
        queryFn: async (): Promise<Route[]> => {
            if (!repId) return [];

            const { data, error } = await supabase
                .from("routes")
                .select("*")
                .eq("rep_id", repId)
                .order("name");

            if (error) throw error;
            return data;
        },
        enabled: !!repId,
    });
}

// Get a single route with all stops and customer data
export function useRouteWithStops(routeId: string | undefined) {
    return useQuery({
        queryKey: ["route", routeId],
        queryFn: async (): Promise<RouteWithStops | null> => {
            if (!routeId) return null;

            // Get route
            const { data: route, error: routeError } = await supabase
                .from("routes")
                .select("*")
                .eq("id", routeId)
                .single();

            if (routeError) throw routeError;

            // Get stops with customer data
            const { data: stops, error: stopsError } = await supabase
                .from("route_stops")
                .select("*")
                .eq("route_id", routeId)
                .order("stop_order");

            if (stopsError) throw stopsError;

            // Fetch customer data for each stop
            const customerNumbers = stops.map(s => s.kunden_nummer);
            const { data: customers, error: customersError } = await supabase
                .from("dim_customers")
                .select("kunden_nummer, firma, ort, plz, strasse, telefon, mobil, latitude, longitude, abc_class, opening_hours_mon, opening_hours_tue, opening_hours_wed, opening_hours_thu, opening_hours_fri, opening_hours_sat, opening_hours_sun, opening_hours_notes")
                .in("kunden_nummer", customerNumbers);

            if (customersError) throw customersError;

            const customerMap = new Map(customers?.map(c => [c.kunden_nummer, c]) || []);

            const stopsWithCustomers: RouteStopWithCustomer[] = stops.map(stop => ({
                ...stop,
                customer: customerMap.get(stop.kunden_nummer) as Customer,
            }));

            return {
                ...route,
                stops: stopsWithCustomers,
            };
        },
        enabled: !!routeId,
    });
}

// Create a new route
export function useCreateRoute() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ repId, name, weekday }: { repId: number; name: string; weekday?: string }) => {
            const { data, error } = await supabase
                .from("routes")
                .insert({ rep_id: repId, name, weekday: weekday || null })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["routes", variables.repId] });
        },
    });
}

// Update route name/weekday
export function useUpdateRoute() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, name, weekday }: { id: string; name?: string; weekday?: string | null }) => {
            const { data, error } = await supabase
                .from("routes")
                .update({ name, weekday, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["routes"] });
            queryClient.invalidateQueries({ queryKey: ["route"] });
        },
    });
}

// Delete a route
export function useDeleteRoute() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (routeId: string) => {
            const { error } = await supabase
                .from("routes")
                .delete()
                .eq("id", routeId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["routes"] });
        },
    });
}

// Add a stop to a route
export function useAddStop() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ routeId, kundenNummer, stopOrder }: { routeId: string; kundenNummer: number; stopOrder: number }) => {
            const { data, error } = await supabase
                .from("route_stops")
                .insert({ route_id: routeId, kunden_nummer: kundenNummer, stop_order: stopOrder })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["route", variables.routeId] });
        },
    });
}

// Remove a stop from a route
export function useRemoveStop() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ stopId, routeId }: { stopId: string; routeId: string }) => {
            const { error } = await supabase
                .from("route_stops")
                .delete()
                .eq("id", stopId);

            if (error) throw error;
            return routeId;
        },
        onSuccess: (routeId) => {
            queryClient.invalidateQueries({ queryKey: ["route", routeId] });
        },
    });
}

// Reorder stops (update all stop_orders)
export function useReorderStops() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ routeId, stopIds }: { routeId: string; stopIds: string[] }) => {
            // Update each stop with new order
            const updates = stopIds.map((id, index) =>
                supabase
                    .from("route_stops")
                    .update({ stop_order: index + 1 })
                    .eq("id", id)
            );

            await Promise.all(updates);
            return routeId;
        },
        onSuccess: (routeId) => {
            queryClient.invalidateQueries({ queryKey: ["route", routeId] });
        },
    });
}

// Generate Google Maps URL
export function generateGoogleMapsUrl(stops: RouteStopWithCustomer[]): string {
    if (stops.length === 0) return "";

    const addresses = stops.map(stop => {
        const customer = stop.customer;
        if (!customer) return "";
        const parts = [customer.strasse, customer.plz, customer.ort].filter(Boolean);
        return encodeURIComponent(parts.join(", "));
    }).filter(Boolean);

    if (addresses.length === 0) return "";
    if (addresses.length === 1) {
        return `https://www.google.com/maps/search/?api=1&query=${addresses[0]}`;
    }

    const origin = addresses[0];
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(1, -1).join("|");

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) {
        url += `&waypoints=${waypoints}`;
    }
    return url;
}
