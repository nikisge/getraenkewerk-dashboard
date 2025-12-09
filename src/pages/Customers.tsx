import { useState, useEffect } from "react";
import { useCustomers, useUpdateCustomer, CustomerFilters } from "@/hooks/useCustomers";
import { useReps } from "@/hooks/useReps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Users, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { NewCustomerModal } from "@/components/NewCustomerModal";
import { PurchaseIntervalSettings } from "@/components/PurchaseIntervalSettings";
import { Button } from "@/components/ui/button";
import { CustomerCard } from "@/components/CustomerCard";

const PAGE_SIZE = 50;

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  // Filters
  const [repFilter, setRepFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [abcFilter, setAbcFilter] = useState<string>("all");

  const { data: reps } = useReps();

  // Build filters object
  const filters: CustomerFilters = {
    searchTerm: debouncedSearch,
    repId: repFilter !== "all" ? parseInt(repFilter) : null,
    statusActive: statusFilter === "all" ? null : statusFilter === "active",
    abcClass: abcFilter !== "all" ? abcFilter : null,
  };

  const { data, isLoading } = useCustomers(filters, { page, pageSize: PAGE_SIZE });
  const updateCustomer = useUpdateCustomer();

  const customers = data?.customers || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 0;

  // Debounce search for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [repFilter, statusFilter, abcFilter]);

  const handleRepChange = (kundenNummer: number, repId: string) => {
    updateCustomer.mutate({
      kunden_nummer: kundenNummer,
      updates: { rep_id: parseInt(repId) },
    }, {
      onSuccess: () => toast.success("Außendienstler aktualisiert"),
      onError: () => toast.error("Fehler beim Aktualisieren"),
    });
  };

  const handleStatusActiveChange = (kundenNummer: number, value: string) => {
    updateCustomer.mutate({
      kunden_nummer: kundenNummer,
      updates: { status_active: value === "active" },
    }, {
      onSuccess: () => toast.success("Status aktualisiert"),
      onError: () => toast.error("Fehler beim Aktualisieren"),
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRepFilter("all");
    setStatusFilter("all");
    setAbcFilter("all");
  };

  const hasActiveFilters = searchTerm || repFilter !== "all" || statusFilter !== "all" || abcFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Kunden</h1>
        <NewCustomerModal />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Kundenverwaltung
              <Badge variant="secondary" className="ml-2">
                {totalCount.toLocaleString()} Kunden
              </Badge>
            </CardTitle>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Nach Firma suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter:</span>
            </div>

            {/* Rep Filter */}
            <Select value={repFilter} onValueChange={setRepFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Außendienstler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Außendienstler</SelectItem>
                {reps?.map((rep) => (
                  <SelectItem key={rep.rep_id} value={rep.rep_id.toString()}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
              </SelectContent>
            </Select>

            {/* ABC Class Filter */}
            <Select value={abcFilter} onValueChange={setAbcFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="ABC-Klasse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Klassen</SelectItem>
                <SelectItem value="A">A-Kunden</SelectItem>
                <SelectItem value="B">B-Kunden</SelectItem>
                <SelectItem value="C">C-Kunden</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Filter zurücksetzen
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kd.-Nr.</TableHead>
                        <TableHead>Firma</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Ort</TableHead>
                        <TableHead>Außendienstler</TableHead>
                        <TableHead>Kaufintervall</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>ABC</TableHead>
                        <TableHead>Umsatz 365d</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                            Keine Kunden gefunden
                          </TableCell>
                        </TableRow>
                      ) : (
                        customers.map((customer) => (
                          <TableRow key={customer.kunden_nummer}>
                            <TableCell className="font-mono text-sm">{customer.kunden_nummer}</TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate" title={customer.firma || ""}>
                              {customer.firma}
                            </TableCell>
                            <TableCell className="text-sm max-w-[180px] truncate" title={customer.email || ""}>
                              {customer.email || "-"}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate">{customer.ort || "-"}</TableCell>
                            <TableCell>
                              <Select
                                value={customer.rep_id?.toString() || ""}
                                onValueChange={(value) => handleRepChange(customer.kunden_nummer, value)}
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue placeholder="Auswählen..." />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {reps?.map((rep) => (
                                    <SelectItem key={rep.rep_id} value={rep.rep_id.toString()}>
                                      {rep.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <PurchaseIntervalSettings
                                kundenNummer={customer.kunden_nummer}
                                currentInterval={customer.purchase_interval}
                                seasonStart={customer.season_start}
                                seasonEnd={customer.season_end}
                                onUpdate={(updates) => {
                                  updateCustomer.mutate({
                                    kunden_nummer: customer.kunden_nummer,
                                    updates: updates,
                                  }, {
                                    onSuccess: () => toast.success("Kaufintervall aktualisiert"),
                                    onError: () => toast.error("Fehler beim Aktualisieren"),
                                  });
                                }}
                                trigger={
                                  <Button variant="outline" size="sm" className="w-[100px] justify-between text-xs">
                                    {customer.season_start && customer.season_end
                                      ? "Saisonal"
                                      : `${customer.purchase_interval || 7} Tage`}
                                  </Button>
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={customer.status_active ? "active" : "inactive"}
                                onValueChange={(value) => handleStatusActiveChange(customer.kunden_nummer, value)}
                              >
                                <SelectTrigger className="w-[90px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  <SelectItem value="active">Aktiv</SelectItem>
                                  <SelectItem value="inactive">Inaktiv</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {customer.abc_class ? (
                                <Badge
                                  variant={
                                    customer.abc_class === "A" ? "default" :
                                    customer.abc_class === "B" ? "secondary" : "outline"
                                  }
                                >
                                  {customer.abc_class}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {customer.revenue_365d
                                ? `€${parseFloat(customer.revenue_365d.toString()).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
                                : "€0,00"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {customers.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Keine Kunden gefunden
                    </div>
                  ) : (
                    customers.map((customer) => (
                      <CustomerCard
                        key={customer.kunden_nummer}
                        customer={customer}
                        reps={reps}
                        onRepChange={handleRepChange}
                        onStatusChange={handleStatusActiveChange}
                        onIntervalUpdate={(updates) => {
                          updateCustomer.mutate({
                            kunden_nummer: customer.kunden_nummer,
                            updates: updates,
                          }, {
                            onSuccess: () => toast.success("Kaufintervall aktualisiert"),
                            onError: () => toast.error("Fehler beim Aktualisieren"),
                          });
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Seite {page + 1} von {totalPages} ({totalCount.toLocaleString()} Kunden)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Zurück
                    </Button>

                    {/* Page numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i;
                        } else if (page < 3) {
                          pageNum = i;
                        } else if (page > totalPages - 4) {
                          pageNum = totalPages - 5 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum + 1}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Weiter
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
