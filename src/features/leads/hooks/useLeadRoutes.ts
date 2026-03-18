import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Lead } from "./useLeads";
import { logActivity, getSessionRepId } from "@/features/activity/services/activityLogger";

type Route = Tables<"routes">;
type RouteStop = Tables<"route_stops">;

export interface LeadRouteStop extends RouteStop {
  lead: Lead | null;
}

export interface LeadRoute extends Route {
  stops?: LeadRouteStop[];
  rep_name?: string;
}

// Haversine-Distanz in Metern
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearest-Neighbor Sortierung: Start beim nördlichsten Lead, dann immer nächster Nachbar
function sortByNearestNeighbor(leads: Lead[]): Lead[] {
  const withCoords = leads.filter(l => l.latitude != null && l.longitude != null);
  const withoutCoords = leads.filter(l => l.latitude == null || l.longitude == null);

  if (withCoords.length === 0) return leads;

  // Start: nördlichster Lead (höchster Breitengrad)
  const sorted: Lead[] = [];
  const remaining = [...withCoords];

  // Nördlichsten finden
  let current = remaining.reduce((best, l) =>
    (l.latitude! > best.latitude!) ? l : best
  );
  sorted.push(current);
  remaining.splice(remaining.indexOf(current), 1);

  // Jeweils nächsten Nachbarn finden
  while (remaining.length > 0) {
    let nearest = remaining[0];
    let nearestDist = Infinity;

    for (const lead of remaining) {
      const dist = haversineDistance(
        current.latitude!, current.longitude!,
        lead.latitude!, lead.longitude!
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = lead;
      }
    }

    sorted.push(nearest);
    remaining.splice(remaining.indexOf(nearest), 1);
    current = nearest;
  }

  // Leads ohne Koordinaten ans Ende
  return [...sorted, ...withoutCoords];
}

// Lead-Route erstellen mit Nearest-Neighbor-Sortierung
export function useCreateLeadRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repId,
      name,
      leads,
    }: {
      repId: number;
      name: string;
      leads: Lead[];
    }) => {
      // 1. Route erstellen
      const { data: route, error: routeError } = await supabase
        .from("routes")
        .insert({
          rep_id: repId,
          name,
          route_type: "lead",
        })
        .select()
        .single();

      if (routeError) throw routeError;

      // 2. Leads nach Nearest-Neighbor sortieren
      const sortedLeads = sortByNearestNeighbor(leads);

      // 3. Stops einfügen
      const stops = sortedLeads.map((lead, index) => ({
        route_id: route.id,
        lead_id: lead.id,
        stop_order: index + 1,
      }));

      const { error: stopsError } = await supabase
        .from("route_stops")
        .insert(stops);

      if (stopsError) throw stopsError;

      return route;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      queryClient.invalidateQueries({ queryKey: ["lead_routes"] });
      const repId = getSessionRepId();
      if (repId) logActivity({ repId, actionType: "create", entityType: "lead_route", entityId: data.id });
    },
  });
}

// Alle Lead-Routen holen
export function useLeadRoutes(repId?: number) {
  return useQuery({
    queryKey: ["lead_routes", repId],
    queryFn: async () => {
      let query = supabase
        .from("routes")
        .select("*")
        .eq("route_type", "lead")
        .order("created_at", { ascending: false });

      if (repId) {
        query = query.eq("rep_id", repId);
      }

      const { data: routes, error } = await query;
      if (error) throw error;

      // Rep-Namen laden
      const repIds = [...new Set(routes.map(r => r.rep_id))];
      const { data: reps } = await supabase
        .from("reps")
        .select("rep_id, name")
        .in("rep_id", repIds);

      const repMap = new Map(reps?.map(r => [r.rep_id, r.name]) || []);

      // Stop-Counts laden
      const routeIds = routes.map(r => r.id);
      const { data: stops } = await supabase
        .from("route_stops")
        .select("route_id, visited_at")
        .in("route_id", routeIds);

      const stopCounts = new Map<string, { total: number; visited: number }>();
      for (const stop of stops || []) {
        const current = stopCounts.get(stop.route_id) || { total: 0, visited: 0 };
        current.total++;
        if (stop.visited_at) current.visited++;
        stopCounts.set(stop.route_id, current);
      }

      return routes.map(route => ({
        ...route,
        rep_name: repMap.get(route.rep_id) || "Unbekannt",
        stop_count: stopCounts.get(route.id)?.total || 0,
        visited_count: stopCounts.get(route.id)?.visited || 0,
      }));
    },
  });
}

// Lead-Route mit Stops und Lead-Daten holen
export function useLeadRouteProgress(routeId: string | undefined) {
  return useQuery({
    queryKey: ["lead_route_progress", routeId],
    queryFn: async () => {
      if (!routeId) return null;

      // Route holen
      const { data: route, error: routeError } = await supabase
        .from("routes")
        .select("*")
        .eq("id", routeId)
        .single();

      if (routeError) throw routeError;

      // Stops holen
      const { data: stops, error: stopsError } = await supabase
        .from("route_stops")
        .select("*")
        .eq("route_id", routeId)
        .order("stop_order");

      if (stopsError) throw stopsError;

      // Lead-Daten holen
      const leadIds = stops.filter(s => s.lead_id).map(s => s.lead_id!);
      let leads: Lead[] = [];
      if (leadIds.length > 0) {
        const { data, error } = await supabase
          .from("gw_leads")
          .select("*")
          .in("id", leadIds);
        if (!error && data) leads = data;
      }

      const leadMap = new Map(leads.map(l => [l.id, l]));

      // Rep-Name
      const { data: rep } = await supabase
        .from("reps")
        .select("name")
        .eq("rep_id", route.rep_id)
        .single();

      const stopsWithLeads: LeadRouteStop[] = stops.map(stop => ({
        ...stop,
        lead: stop.lead_id ? leadMap.get(stop.lead_id) || null : null,
      }));

      return {
        ...route,
        stops: stopsWithLeads,
        rep_name: rep?.name || "Unbekannt",
      } as LeadRoute;
    },
    enabled: !!routeId,
  });
}

// Stop als besucht markieren + Lead-Status auf "kontaktiert"
export function useMarkStopVisited() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stopId, leadId }: { stopId: string; leadId?: number | null }) => {
      // 1. Stop als besucht markieren
      const { error: stopError } = await supabase
        .from("route_stops")
        .update({ visited_at: new Date().toISOString() })
        .eq("id", stopId);

      if (stopError) throw stopError;

      // 2. Lead-Status auf "kontaktiert" setzen
      if (leadId) {
        const { error: leadError } = await supabase
          .from("gw_leads")
          .update({
            status: "kontaktiert",
            updated_at: new Date().toISOString(),
          })
          .eq("id", leadId);

        if (leadError) throw leadError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route"] });
      queryClient.invalidateQueries({ queryKey: ["lead_route_progress"] });
      queryClient.invalidateQueries({ queryKey: ["lead_routes"] });
      queryClient.invalidateQueries({ queryKey: ["gw_leads"] });
    },
  });
}
