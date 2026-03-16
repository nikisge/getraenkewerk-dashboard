import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Compass, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useApifySearch } from "@/features/leads/hooks/useApifySearch";
import { useLeadSearches } from "@/features/leads/hooks/useLeadSearches";
import { useLeads, LeadStatus } from "@/features/leads/hooks/useLeads";
import { LeadSearchForm } from "@/features/leads/components/LeadSearchForm";
import { LeadSearchCard } from "@/features/leads/components/LeadSearchCard";
import { LeadSearchResults } from "@/features/leads/components/LeadSearchResults";

export default function LeadResearch() {
  const { rep } = useAuth();
  const apifySearch = useApifySearch();
  const { data: searches, isLoading: searchesLoading } = useLeadSearches(rep?.rep_id);

  // State für aktuelle Suche
  const [lastSearchId, setLastSearchId] = useState<number | null>(null);

  // Alle Leads Tab: Filter
  const [allLeadsSearch, setAllLeadsSearch] = useState("");
  const [debouncedAllLeadsSearch, setDebouncedAllLeadsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Tab state
  const [activeTab, setActiveTab] = useState("search");

  // Leads für aktuelle Suche
  const { data: searchLeads, isLoading: searchLeadsLoading } = useLeads(
    lastSearchId ? { searchId: lastSearchId } : { searchId: -1 }
  );

  // Alle Leads
  const { data: allLeads, isLoading: allLeadsLoading } = useLeads({
    searchTerm: debouncedAllLeadsSearch || undefined,
    status: statusFilter !== "all" ? (statusFilter as LeadStatus) : null,
  });

  // Debounce für Alle Leads Suche
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAllLeadsSearch(allLeadsSearch), 300);
    return () => clearTimeout(timer);
  }, [allLeadsSearch]);

  const handleSearch = (searchTerm: string, location: string, maxResults: number) => {
    if (!rep) return;
    apifySearch.mutate(
      { searchTerm, location, maxResults, repId: rep.rep_id },
      {
        onSuccess: (result) => {
          setLastSearchId(result.searchId);
          toast.success(`${result.resultCount} Leads gefunden!`);
        },
        onError: (error) => {
          toast.error(error.message || "Fehler bei der Suche");
        },
      }
    );
  };

  const handleSearchCardClick = (searchId: number) => {
    setLastSearchId(searchId);
    setActiveTab("search");
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Compass className="h-8 w-8" />
        Lead Recherche
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="search">Neue Suche</TabsTrigger>
          <TabsTrigger value="history">Meine Suchen</TabsTrigger>
          <TabsTrigger value="all">Alle Leads</TabsTrigger>
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

          {/* Ergebnisse der letzten Suche */}
          {lastSearchId && (
            <Card>
              <CardHeader>
                <CardTitle>Suchergebnisse</CardTitle>
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
        <TabsContent value="history">
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
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Alle Leads */}
        <TabsContent value="all">
          <Card>
            <CardHeader className="space-y-4">
              <CardTitle>Alle Leads</CardTitle>
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
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
