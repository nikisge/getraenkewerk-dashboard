import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCustomers, useUpdateCustomer, CustomerFilters, Customer } from "@/features/customers/hooks/useCustomers";
import { useReps } from "@/features/reps/hooks/useReps";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Search, ChevronLeft, ChevronRight, Users, Filter, X, AlertCircle, Edit } from "lucide-react";
import { toast } from "sonner";
import { NewCustomerModal } from "@/features/customers/components/NewCustomerModal";
import { PurchaseIntervalSettings } from "@/features/customers/components/PurchaseIntervalSettings";
import { EditCustomerModal } from "@/features/customers/components/EditCustomerModal";
import { Button } from "@/shared/components/ui/button";
import { CustomerCard } from "@/features/customers/components/CustomerCard";

const PAGE_SIZE = 50;

export default function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [incompletePage, setIncompletePage] = useState(0);
  const [activeTab, setActiveTab] = useState("all");

  // Edit modal state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Filters
  const [repFilter, setRepFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [abcFilter, setAbcFilter] = useState<string>("all");

  const { data: reps } = useReps();

  // Build filters object for all customers
  const allFilters: CustomerFilters = {
    searchTerm: debouncedSearch,
    repId: repFilter !== "all" ? parseInt(repFilter) : null,
    statusActive: statusFilter === "all" ? null : statusFilter === "active",
    abcClass: abcFilter !== "all" ? abcFilter : null,
  };

  // Filters for incomplete customers (auto_generated)
  const incompleteFilters: CustomerFilters = {
    incompleteOnly: true,
    searchTerm: debouncedSearch,
  };

  const { data, isLoading } = useCustomers(allFilters, { page, pageSize: PAGE_SIZE });
  const { data: incompleteData, isLoading: incompleteLoading } = useCustomers(incompleteFilters, { page: incompletePage, pageSize: PAGE_SIZE });
  const updateCustomer = useUpdateCustomer();

  const customers = data?.customers || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 0;

  const incompleteCustomers = incompleteData?.customers || [];
  const incompleteTotalCount = incompleteData?.totalCount || 0;
  const incompleteTotalPages = incompleteData?.totalPages || 0;

  // Handle URL parameter for direct customer edit
  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam && incompleteCustomers.length > 0) {
      const customerToEdit = incompleteCustomers.find(
        c => c.kunden_nummer.toString() === editParam
      );
      if (customerToEdit) {
        setEditingCustomer(customerToEdit);
        setActiveTab("incomplete");
        // Clear the URL param after opening
        setSearchParams({});
      }
    }
  }, [searchParams, incompleteCustomers, setSearchParams]);

  // Debounce search for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
      setIncompletePage(0);
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

  // Render the customer table (used for both tabs)
  // showIncompleteWarnings: show orange "fehlt" indicators and "Unvollständig" badge (for incomplete tab)
  const renderCustomerTable = (customerList: Customer[], showIncompleteWarnings = false) => (
    <>
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
              {!showIncompleteWarnings && <TableHead>Kaufintervall</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>ABC</TableHead>
              <TableHead>Umsatz 365d</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customerList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Keine Kunden gefunden
                </TableCell>
              </TableRow>
            ) : (
              customerList.map((customer) => (
                <TableRow
                  key={customer.kunden_nummer}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setEditingCustomer(customer)}
                >
                  <TableCell className="font-mono text-sm">{customer.kunden_nummer}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate" title={customer.firma || ""}>
                    {customer.firma}
                  </TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate" title={customer.email || ""}>
                    {customer.email || (showIncompleteWarnings ? <span className="text-orange-500">fehlt</span> : "-")}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate">
                    {customer.ort || (showIncompleteWarnings ? <span className="text-orange-500">fehlt</span> : "-")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {showIncompleteWarnings ? (
                      <span>{reps?.find(r => r.rep_id === customer.rep_id)?.name || "-"}</span>
                    ) : (
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
                    )}
                  </TableCell>
                  {!showIncompleteWarnings && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {showIncompleteWarnings ? (
                      <Badge variant={customer.status_active ? "default" : "destructive"}>
                        {customer.status_active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    ) : (
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
                    )}
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
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {customerList.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Keine Kunden gefunden
          </div>
        ) : (
          customerList.map((customer) => (
            showIncompleteWarnings ? (
              <Card
                key={customer.kunden_nummer}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setEditingCustomer(customer)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{customer.firma}</p>
                      <p className="text-sm text-muted-foreground">Kd.-Nr: {customer.kunden_nummer}</p>
                    </div>
                    <Badge variant="outline" className="text-orange-500 border-orange-500">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Unvollständig
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>Email: {customer.email || <span className="text-orange-500">fehlt</span>}</p>
                    <p>Ort: {customer.ort || <span className="text-orange-500">fehlt</span>}</p>
                    <p>Telefon: {customer.telefon || <span className="text-orange-500">fehlt</span>}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div key={customer.kunden_nummer} onClick={() => setEditingCustomer(customer)}>
                <CustomerCard
                  customer={customer}
                  reps={reps}
                  onRepChange={(kn, val) => { handleRepChange(kn, val); }}
                  onStatusChange={(kn, val) => { handleStatusActiveChange(kn, val); }}
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
              </div>
            )
          ))
        )}
      </div>
    </>
  );

  // Render pagination component
  const renderPagination = (currentPage: number, setCurrentPage: (p: number | ((prev: number) => number)) => void, total: number, pageCount: number, count: number) => (
    pageCount > 1 && (
      <div className="flex items-center justify-between border-t pt-4 mt-4">
        <div className="text-sm text-muted-foreground">
          Seite {currentPage + 1} von {pageCount} ({total.toLocaleString()} Kunden)
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p: number) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>

          {/* Page numbers */}
          <div className="hidden sm:flex items-center gap-1">
            {[...Array(Math.min(5, pageCount))].map((_, i) => {
              let pageNum;
              if (pageCount <= 5) {
                pageNum = i;
              } else if (currentPage < 3) {
                pageNum = i;
              } else if (currentPage > pageCount - 4) {
                pageNum = pageCount - 5 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p: number) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
          >
            Weiter
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Kunden</h1>
        <NewCustomerModal />
      </div>

      {/* Edit Customer Modal */}
      <EditCustomerModal
        customer={editingCustomer}
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">Alle Kunden</TabsTrigger>
          <TabsTrigger value="incomplete" className="relative">
            Unvollständige Kunden
            {incompleteTotalCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                {incompleteTotalCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Customers Tab */}
        <TabsContent value="all">
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
                    {renderCustomerTable(customers)}
                  </div>
                  {renderPagination(page, setPage, totalCount, totalPages, customers.length)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incomplete Customers Tab */}
        <TabsContent value="incomplete">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <span className="text-orange-500">Unvollständige Kunden</span>
                  <Badge variant="outline" className="ml-2 border-orange-500 text-orange-500">
                    {incompleteTotalCount} Kunden
                  </Badge>
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Diese Kunden wurden automatisch durch den Umsatz-Upload erstellt und haben fehlende Daten.
                Klicke auf einen Kunden, um die Daten zu vervollständigen.
              </p>

              {/* Search for incomplete too */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nach Firma suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>

            <CardContent>
              {incompleteLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : incompleteTotalCount === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🎉</div>
                  <p className="text-lg font-semibold text-green-600">Alle Kunden vollständig!</p>
                  <p className="text-muted-foreground">Es gibt keine unvollständigen Kundendaten.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    {renderCustomerTable(incompleteCustomers, true)}
                  </div>
                  {renderPagination(incompletePage, setIncompletePage, incompleteTotalCount, incompleteTotalPages, incompleteCustomers.length)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
