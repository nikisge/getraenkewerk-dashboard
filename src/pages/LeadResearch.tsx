import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Compass, Search, Filter, CheckSquare, MapPin, User, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useApifySearch } from "@/features/leads/hooks/useApifySearch";
import { useLeadSearches } from "@/features/leads/hooks/useLeadSearches";
import { useLeads, LeadStatus } from "@/features/leads/hooks/useLeads";
import { useLeadRoutes } from "@/features/leads/hooks/useLeadRoutes";
import { LeadSearchForm } from "@/features/leads/components/LeadSearchForm";
import { LeadSearchCard } from "@/features/leads/components/LeadSearchCard";
import { LeadSearchResults } from "@/features/leads/components/LeadSearchResults";
import { CreateLeadRouteDialog } from "@/features/leads/components/CreateLeadRouteDialog";
import { LeadRouteProgress } from "@/features/leads/components/LeadRouteProgress";

export default function LeadResearch() {
  const { rep } = useAuth();
  const apifySearch = useApifySearch();
  const { data: searches, isLoading: searchesLoading } = useLeadSearches(rep?.rep_id);

  // State für ausgewählte Suche
  const [selectedSearchId, setSelectedSearchId] = useState<number | null>(null);

  // Alle Leads Tab: Filter
  const [allLeadsSearch, setAllLeadsSearch] = useState("");
  const [debouncedAllLeadsSearch, setDebouncedAllLeadsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [plzFilter, setPlzFilter] = useState("");
  const [debouncedPlzFilter, setDebouncedPlzFilter] = useState("");

  // Auswahl-Modus
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [isCreateRouteOpen, setIsCreateRouteOpen] = useState(false);

  // Lead-Runden Tab
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeRepFilter, setRouteRepFilter] = useState<string>("all");

  // Tab state
  const [activeTab, setActiveTab] = useState("search");

  // Beim Tab-Wechsel weg von "Meine Suchen" → Auswahl zurücksetzen
  const handleTabChange = (tab: string) => {
    if (tab !== "history") {
      setSelectedSearchId(null);
    }
    setActiveTab(tab);
  };

  // Place-IDs der ausgewählten Suche ermitteln
  const selectedSearch = useMemo(
    () => searches?.find((s) => s.id === selectedSearchId),
    [searches, selectedSearchId]
  );

  const selectedPlaceIds = useMemo(() => {
    if (!selectedSearch?.found_place_ids) return null;
    const ids = selectedSearch.found_place_ids as string[];
    return ids.length > 0 ? ids : null;
  }, [selectedSearch]);

  // Leads für ausgewählte Suche (über place_ids)
  const { data: searchLeads, isLoading: searchLeadsLoading } = useLeads(
    selectedPlaceIds ? { placeIds: selectedPlaceIds } : { placeIds: null }
  );

  // Alle Leads (ohne placeIds-Filter)
  const { data: allLeads, isLoading: allLeadsLoading } = useLeads({
    searchTerm: debouncedAllLeadsSearch || undefined,
    status: statusFilter !== "all" ? (statusFilter as LeadStatus) : null,
    plz: debouncedPlzFilter || undefined,
  });

  // Lead-Routen
  const { data: leadRoutes, isLoading: routesLoading } = useLeadRoutes();

  // Debounce für Alle Leads Suche
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAllLeadsSearch(allLeadsSearch), 300);
    return () => clearTimeout(timer);
  }, [allLeadsSearch]);

  // Debounce für PLZ-Filter
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPlzFilter(plzFilter), 300);
    return () => clearTimeout(timer);
  }, [plzFilter]);

  const handleSearch = (searchTerm: string, location: string, maxResults: number) => {
    if (!rep) return;
    apifySearch.mutate(
      { searchTerm, location, maxResults, repId: rep.rep_id },
      {
        onSuccess: (result) => {
          setSelectedSearchId(result.searchId);
          const parts = [`${result.newLeadsCount} neue Leads gefunden`];
          if (result.resultCount > result.newLeadsCount) {
            parts.push(`${result.resultCount - result.newLeadsCount} bereits bekannt`);
          }
          if (result.apiCalls > 1) {
            parts.push(`${result.apiCalls} API-Runden`);
          }
          if (result.exhausted && result.newLeadsCount < maxResults) {
            parts.push("keine weiteren Ergebnisse bei Google Maps");
          }
          toast.success(parts.join(" — "));
        },
        onError: (error) => {
          toast.error(error.message || "Fehler bei der Suche");
        },
      }
    );
  };

  const handleSearchCardClick = (searchId: number) => {
    setSelectedSearchId(searchId === selectedSearchId ? null : searchId);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedLeadIds(new Set());
  };

  const handleRouteCreated = () => {
    setSelectionMode(false);
    setSelectedLeadIds(new Set());
  };

  // Ausgewählte Leads für Route-Erstellung
  const selectedLeads = useMemo(() => {
    if (!allLeads || selectedLeadIds.size === 0) return [];
    return allLeads.filter(l => selectedLeadIds.has(l.id));
  }, [allLeads, selectedLeadIds]);

  // Gefilterte Lead-Routen
  const filteredRoutes = useMemo(() => {
    if (!leadRoutes) return [];
    if (routeRepFilter === "all") return leadRoutes;
    return leadRoutes.filter(r => String(r.rep_id) === routeRepFilter);
  }, [leadRoutes, routeRepFilter]);

  // Eindeutige Reps aus Lead-Routen
  const routeReps = useMemo(() => {
    if (!leadRoutes) return [];
    const map = new Map<number, string>();
    for (const r of leadRoutes) {
      if (!map.has(r.rep_id)) map.set(r.rep_id, r.rep_name || "Unbekannt");
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [leadRoutes]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Compass className="h-8 w-8" />
        Lead Recherche
      </h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="search">Neue Suche</TabsTrigger>
          <TabsTrigger value="history">Meine Suchen</TabsTrigger>
          <TabsTrigger value="all">Alle Leads</TabsTrigger>
          <TabsTrigger value="routes" className="gap-1">
            Lead-Runden
            {leadRoutes && leadRoutes.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{leadRoutes.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Neue Suche */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Google Maps Suche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadSearchForm
                onSearch={handleSearch}
                isLoading={apifySearch.isPending}
              />
            </CardContent>
          </Card>

          {/* Ergebnisse der ausgewählten Suche */}
          {selectedSearchId && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Suchergebnisse
                  {selectedSearch && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      "{selectedSearch.search_term}" in {selectedSearch.location}
                      {" — "}{selectedPlaceIds?.length || 0} Leads
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeadSearchResults
                  leads={searchLeads || []}
                  isLoading={searchLeadsLoading}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Meine Suchen */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vergangene Suchen</CardTitle>
            </CardHeader>
            <CardContent>
              {searchesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Laden...</div>
              ) : !searches?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  Noch keine Suchen durchgeführt
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searches.map((search) => (
                    <LeadSearchCard
                      key={search.id}
                      search={search}
                      onClick={handleSearchCardClick}
                      isActive={search.id === selectedSearchId}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ergebnisse der ausgewählten vergangenen Suche */}
          {selectedSearchId && activeTab === "history" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Suchergebnisse
                  {selectedSearch && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      "{selectedSearch.search_term}" in {selectedSearch.location}
                      {" — "}{selectedPlaceIds?.length || 0} Leads
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeadSearchResults
                  leads={searchLeads || []}
                  isLoading={searchLeadsLoading}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Alle Leads */}
        <TabsContent value="all">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle>Alle Leads</CardTitle>
                <Button
                  variant={selectionMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleSelectionMode}
                  className="gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  {selectionMode ? "Auswahl beenden" : "Auswählen"}
                </Button>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Nach Name oder Adresse suchen..."
                    value={allLeadsSearch}
                    onChange={(e) => setAllLeadsSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="PLZ"
                    value={plzFilter}
                    onChange={(e) => setPlzFilter(e.target.value)}
                    className="w-[100px]"
                    maxLength={5}
                  />
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Alle Status</SelectItem>
                      <SelectItem value="neu">Neu</SelectItem>
                      <SelectItem value="kontaktiert">Kontaktiert</SelectItem>
                      <SelectItem value="kein_interesse">Kein Interesse</SelectItem>
                      <SelectItem value="kunde">Kunde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LeadSearchResults
                leads={allLeads || []}
                isLoading={allLeadsLoading}
                selectable={selectionMode}
                selectedIds={selectedLeadIds}
                onSelectionChange={setSelectedLeadIds}
              />
            </CardContent>
          </Card>

          {/* Floating Action Bar */}
          {selectionMode && selectedLeadIds.size > 0 && (
            <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50">
              <Button
                size="lg"
                className="shadow-lg gap-2 rounded-full px-6"
                onClick={() => setIsCreateRouteOpen(true)}
              >
                <MapPin className="h-5 w-5" />
                {selectedLeadIds.size} Leads ausgewählt — Lead-Runde erstellen
              </Button>
            </div>
          )}

          <CreateLeadRouteDialog
            isOpen={isCreateRouteOpen}
            onClose={() => setIsCreateRouteOpen(false)}
            selectedLeads={selectedLeads}
            defaultPlz={plzFilter || undefined}
            onSuccess={handleRouteCreated}
          />
        </TabsContent>

        {/* Tab: Lead-Runden */}
        <TabsContent value="routes">
          <Card>
            <CardHeader className="space-y-4">
              <CardTitle>Lead-Runden</CardTitle>
              {routeReps.length > 1 && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Select value={routeRepFilter} onValueChange={setRouteRepFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Alle Mitarbeiter" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                      {routeReps.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {routesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Laden...</div>
              ) : !filteredRoutes.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  Keine Lead-Runden vorhanden.
                  <br />
                  <span className="text-xs">Wähle Leads im "Alle Leads" Tab aus, um eine Lead-Runde zu erstellen.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRoutes.map((route) => {
                    const total = (route as any).stop_count || 0;
                    const visited = (route as any).visited_count || 0;
                    const progressPercent = total > 0 ? Math.round((visited / total) * 100) : 0;

                    return (
                      <div
                        key={route.id}
                        className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedRouteId(route.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{route.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {(route as any).rep_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(route.created_at).toLocaleDateString("de-DE")}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant={progressPercent === 100 ? "default" : "secondary"}
                            className={progressPercent === 100 ? "bg-green-600" : ""}
                          >
                            {visited}/{total}
                          </Badge>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <LeadRouteProgress
            routeId={selectedRouteId}
            isOpen={!!selectedRouteId}
            onClose={() => setSelectedRouteId(null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
