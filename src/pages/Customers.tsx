import { useState, useEffect } from "react";
import { useCustomers, useUpdateCustomer } from "@/hooks/useCustomers";
import { useReps } from "@/hooks/useReps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { NewCustomerModal } from "@/components/NewCustomerModal";
import { PurchaseIntervalSettings } from "@/components/PurchaseIntervalSettings";
import { Button } from "@/components/ui/button";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data: customers, isLoading } = useCustomers(debouncedSearch);
  const { data: reps } = useReps();
  const updateCustomer = useUpdateCustomer();

  // Debounce search for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleRepChange = (kundenNummer: number, repId: string) => {
    updateCustomer.mutate({
      kunden_nummer: kundenNummer,
      updates: { rep_id: parseInt(repId) },
    }, {
      onSuccess: () => toast.success("Außendienstler aktualisiert"),
      onError: () => toast.error("Fehler beim Aktualisieren"),
    });
  };

  const handlePurchaseIntervalChange = (kundenNummer: number, interval: string) => {
    updateCustomer.mutate({
      kunden_nummer: kundenNummer,
      updates: { purchase_interval: interval as "7" | "14" | "21" | "28" | "Saisonal" },
    }, {
      onSuccess: () => toast.success("Kaufintervall aktualisiert"),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Kunden</h1>
        <NewCustomerModal />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kundenverwaltung</CardTitle>
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
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kd.-Nr.</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ort</TableHead>
                    <TableHead>Außendienstler</TableHead>
                    <TableHead>Kaufintervall</TableHead>
                    <TableHead>Kunde inaktiv</TableHead>
                    <TableHead>Umsatz 365d</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Keine Kunden gefunden
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers?.map((customer) => (
                      <TableRow key={customer.kunden_nummer}>
                        <TableCell className="font-mono">{customer.kunden_nummer}</TableCell>
                        <TableCell className="font-medium">{customer.firma}</TableCell>
                        <TableCell className="text-sm">{customer.email}</TableCell>
                        <TableCell>{customer.ort}</TableCell>
                        <TableCell>
                          <Select
                            value={customer.rep_id?.toString() || ""}
                            onValueChange={(value) => handleRepChange(customer.kunden_nummer, value)}
                          >
                            <SelectTrigger className="w-[180px]">
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
                            seasonalInterval={customer.seasonal_interval}
                            customInterval={customer.custom_interval}
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
                              <Button variant="outline" className="w-[120px] justify-between">
                                {customer.purchase_interval === "Manual"
                                  ? `${customer.custom_interval} Tage`
                                  : customer.purchase_interval === "Saisonal"
                                    ? "Saisonal"
                                    : `${customer.purchase_interval} Tage`}
                              </Button>
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={customer.status_active ? "active" : "inactive"}
                            onValueChange={(value) => handleStatusActiveChange(customer.kunden_nummer, value)}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="active">Nein</SelectItem>
                              <SelectItem value="inactive">Ja</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-mono">
                          €{customer.revenue_365d ? parseFloat(customer.revenue_365d.toString()).toFixed(2) : "0.00"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
