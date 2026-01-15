import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useRoutes, useRouteWithStops, useCreateRoute, useDeleteRoute, useAddStop, useRemoveStop, useReorderStops, generateGoogleMapsUrl, RouteStopWithCustomer } from "@/features/routes/hooks/useRoutes";
import { useCustomers, Customer } from "@/features/customers/hooks/useCustomers";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Plus, Trash2, Navigation, GripVertical, MapPin, Clock, Phone, ChevronLeft, Search, X, Map } from "lucide-react";
import { toast } from "sonner";
import { OpeningHoursDisplay } from "@/features/customers/components/OpeningHoursDisplay";
import { RouteMapView } from "@/features/routes/components/RouteMapView";

const WEEKDAYS = [
    { value: "mo", label: "Montag" },
    { value: "di", label: "Dienstag" },
    { value: "mi", label: "Mittwoch" },
    { value: "do", label: "Donnerstag" },
    { value: "fr", label: "Freitag" },
    { value: "sa", label: "Samstag" },
    { value: "so", label: "Sonntag" },
];

export default function RoutePlanning() {
    const { rep } = useAuth();
    const { data: routes, isLoading: routesLoading } = useRoutes(rep?.rep_id);
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [isMapView, setIsMapView] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newRouteName, setNewRouteName] = useState("");
    const [newRouteWeekday, setNewRouteWeekday] = useState<string>("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

    const { data: routeWithStops, isLoading: routeLoading } = useRouteWithStops(selectedRouteId || undefined);
    const { data: customersData } = useCustomers(
        { repId: rep?.rep_id, searchTerm: customerSearch },
        { page: 0, pageSize: 50 }
    );

    const createRoute = useCreateRoute();
    const deleteRoute = useDeleteRoute();
    const addStop = useAddStop();
    const removeStop = useRemoveStop();
    const reorderStops = useReorderStops();

    const handleCreateRoute = async () => {
        if (!rep?.rep_id || !newRouteName.trim()) return;

        try {
            const route = await createRoute.mutateAsync({
                repId: rep.rep_id,
                name: newRouteName.trim(),
                weekday: newRouteWeekday === "none" ? undefined : newRouteWeekday,
            });
            setNewRouteName("");
            setNewRouteWeekday("");
            setIsCreateDialogOpen(false);
            setSelectedRouteId(route.id);
            setIsMapView(true); // Direkt zur Map-Ansicht wechseln
            toast.success("Route erstellt");
        } catch {
            toast.error("Fehler beim Erstellen");
        }
    };

    const handleDeleteRoute = async (routeId: string) => {
        if (!confirm("Route wirklich löschen?")) return;

        try {
            await deleteRoute.mutateAsync(routeId);
            if (selectedRouteId === routeId) {
                setSelectedRouteId(null);
            }
            toast.success("Route gelöscht");
        } catch {
            toast.error("Fehler beim Löschen");
        }
    };

    const handleAddCustomer = async (customer: Customer) => {
        if (!selectedRouteId) return;

        // Check if already in route
        if (routeWithStops?.stops.some(s => s.kunden_nummer === customer.kunden_nummer)) {
            toast.error("Kunde bereits in Route");
            return;
        }

        try {
            await addStop.mutateAsync({
                routeId: selectedRouteId,
                kundenNummer: customer.kunden_nummer,
                stopOrder: (routeWithStops?.stops.length || 0) + 1,
            });
            toast.success(`${customer.firma} hinzugefügt`);
        } catch {
            toast.error("Fehler beim Hinzufügen");
        }
    };

    const handleRemoveStop = async (stopId: string) => {
        if (!selectedRouteId) return;

        try {
            await removeStop.mutateAsync({ stopId, routeId: selectedRouteId });
            toast.success("Stopp entfernt");
        } catch {
            toast.error("Fehler beim Entfernen");
        }
    };

    const moveStop = async (index: number, direction: 'up' | 'down') => {
        if (!routeWithStops || !selectedRouteId) return;

        const stops = [...routeWithStops.stops];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= stops.length) return;

        [stops[index], stops[newIndex]] = [stops[newIndex], stops[index]];

        try {
            await reorderStops.mutateAsync({
                routeId: selectedRouteId,
                stopIds: stops.map(s => s.id),
            });
        } catch {
            toast.error("Fehler beim Sortieren");
        }
    };

    const openGoogleMaps = () => {
        if (!routeWithStops?.stops.length) return;
        const url = generateGoogleMapsUrl(routeWithStops.stops);
        if (url) {
            window.open(url, '_blank');
        } else {
            toast.error("Keine Adressen vorhanden");
        }
    };

    // Map View (new interactive view)
    if (selectedRouteId && isMapView) {
        return (
            <RouteMapView
                routeId={selectedRouteId}
                onBack={() => {
                    setIsMapView(false);
                    setSelectedRouteId(null);
                }}
            />
        );
    }

    // Route list view
    if (!selectedRouteId) {
        return (
            <div className="container mx-auto p-4 max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Routenplanung</h1>
                        <p className="text-muted-foreground">Plane deine Kundenbesuche</p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Neue Route
                    </Button>
                </div>

                {routesLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                    </div>
                ) : routes && routes.length > 0 ? (
                    <div className="grid gap-3">
                        {routes.map(route => (
                            <Card
                                key={route.id}
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                    setSelectedRouteId(route.id);
                                    setIsMapView(true);
                                }}
                            >
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-lg">
                                            <Map className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{route.name}</h3>
                                            {route.weekday && (
                                                <Badge variant="secondary" className="mt-1">
                                                    {WEEKDAYS.find(w => w.value === route.weekday)?.label || route.weekday}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="p-8 text-center">
                        <Map className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">Keine Routen vorhanden</h3>
                        <p className="text-muted-foreground mb-4">Erstelle deine erste Route für Kundenbesuche</p>
                        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Route erstellen
                        </Button>
                    </Card>
                )}

                {/* Create Route Dialog */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Neue Route erstellen</DialogTitle>
                            <DialogDescription>Gib der Route einen Namen und optional einen Wochentag.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="routeName">Name</Label>
                                <Input
                                    id="routeName"
                                    placeholder="z.B. Hamburg Nord"
                                    value={newRouteName}
                                    onChange={(e) => setNewRouteName(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Wochentag (optional)</Label>
                                <Select value={newRouteWeekday || "none"} onValueChange={setNewRouteWeekday}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Kein bestimmter Tag" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Kein bestimmter Tag</SelectItem>
                                        {WEEKDAYS.map(day => (
                                            <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Abbrechen</Button>
                            <Button onClick={handleCreateRoute} disabled={!newRouteName.trim()}>Erstellen</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // Route detail view
    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => setSelectedRouteId(null)}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">{routeWithStops?.name || "Route"}</h1>
                    {routeWithStops?.weekday && (
                        <Badge variant="secondary">
                            {WEEKDAYS.find(w => w.value === routeWithStops.weekday)?.label}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsMapView(true)} className="gap-2">
                        <Map className="h-4 w-4" />
                        Karte
                    </Button>
                    <Button onClick={openGoogleMaps} disabled={!routeWithStops?.stops.length} className="gap-2">
                        <Navigation className="h-4 w-4" />
                        Navigation
                    </Button>
                </div>
            </div>

            {routeLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
            ) : (
                <>
                    {/* Stops List */}
                    <div className="space-y-2 mb-4">
                        {routeWithStops?.stops.map((stop, index) => (
                            <Card key={stop.id} className="overflow-hidden">
                                <CardContent className="p-3 flex items-start gap-3">
                                    <div className="flex flex-col items-center gap-1 pt-1">
                                        <button
                                            onClick={() => moveStop(index, 'up')}
                                            disabled={index === 0}
                                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                        >
                                            ▲
                                        </button>
                                        <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </div>
                                        <button
                                            onClick={() => moveStop(index, 'down')}
                                            disabled={index === routeWithStops.stops.length - 1}
                                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                        >
                                            ▼
                                        </button>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold truncate">{stop.customer?.firma || "Unbekannt"}</h4>
                                            <span className="text-xs text-muted-foreground">#{stop.customer?.kunden_nummer}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            <span className="truncate">
                                                {stop.customer?.strasse && `${stop.customer.strasse}, `}
                                                {stop.customer?.plz} {stop.customer?.ort}
                                            </span>
                                        </div>
                                        {stop.customer?.telefon && (
                                            <div className="flex items-center gap-1 text-sm mt-1">
                                                <Phone className="h-3 w-3" />
                                                <a href={`tel:${stop.customer.telefon}`} className="text-primary hover:underline">
                                                    {stop.customer.telefon}
                                                </a>
                                            </div>
                                        )}
                                        {stop.customer && (
                                            <div className="mt-2">
                                                <OpeningHoursDisplay customer={stop.customer} compact />
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveStop(stop.id)}
                                        className="shrink-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Add Customer Button */}
                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => setIsAddCustomerOpen(true)}
                    >
                        <Plus className="h-4 w-4" />
                        Kunden hinzufügen
                    </Button>

                    {/* Add Customer Dialog */}
                    <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
                        <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Kunde zur Route hinzufügen</DialogTitle>
                            </DialogHeader>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Kunde suchen..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                                {customersData?.customers.map(customer => {
                                    const isInRoute = routeWithStops?.stops.some(s => s.kunden_nummer === customer.kunden_nummer);
                                    return (
                                        <Card
                                            key={customer.kunden_nummer}
                                            className={`cursor-pointer transition-colors ${isInRoute ? 'opacity-50' : 'hover:bg-muted/50'}`}
                                            onClick={() => !isInRoute && handleAddCustomer(customer)}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-medium">{customer.firma}</h4>
                                                            <span className="text-xs text-muted-foreground">#{customer.kunden_nummer}</span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            {customer.strasse && `${customer.strasse}, `}
                                                            {customer.plz} {customer.ort}
                                                        </p>
                                                    </div>
                                                    {isInRoute ? (
                                                        <Badge variant="secondary">Bereits hinzugefügt</Badge>
                                                    ) : (
                                                        <Plus className="h-5 w-5 text-primary" />
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
}
