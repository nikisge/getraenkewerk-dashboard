import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useRouteWithStops, useAddStop, useRemoveStop, useReorderStops, useUpdateRoute, RouteStopWithCustomer } from '../hooks/useRoutes';
import { useCustomers, Customer } from '@/features/customers/hooks/useCustomers';
import { GoogleMapsProvider } from './GoogleMapsProvider';
import { RouteMap, LegDuration } from './RouteMap';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import {
  Search,
  Plus,
  X,
  GripVertical,
  MapPin,
  Phone,
  Navigation,
  ChevronLeft,
  Route,
  Users,
  Map,
  List,
  User,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { OpeningHoursDisplay } from '@/features/customers/components/OpeningHoursDisplay';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RouteMapViewProps {
  routeId: string;
  onBack: () => void;
}

// Sortable Stop Item Component
function SortableStopItem({
  stop,
  index,
  onRemove,
  isSelected,
  onSelect,
  arrivalTime,
  driveTime,
}: {
  stop: RouteStopWithCustomer;
  index: number;
  onRemove: () => void;
  isSelected: boolean;
  onSelect: () => void;
  arrivalTime?: string;
  driveTime?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-lg p-3 ${isSelected ? 'ring-2 ring-primary' : ''} ${isDragging ? 'shadow-lg' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate text-sm">{stop.customer?.firma || 'Unbekannt'}</span>
            {arrivalTime && (
              <span className="text-xs font-medium text-primary shrink-0">~{arrivalTime}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {stop.customer?.strasse && `${stop.customer.strasse}, `}
              {stop.customer?.plz} {stop.customer?.ort}
            </span>
          </div>
          {driveTime && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{driveTime} Fahrt</span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Customer List Item Component
function CustomerListItem({
  customer,
  isInRoute,
  isSelected,
  onAdd,
  onSelect,
}: {
  customer: Customer;
  isInRoute: boolean;
  isSelected: boolean;
  onAdd: () => void;
  onSelect: () => void;
}) {
  const getAbcColor = (abcClass: string | null) => {
    switch (abcClass) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-yellow-500';
      case 'C': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        isInRoute ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'
      } ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => !isInRoute && onSelect()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getAbcColor(customer.abc_class)}`} />
            <span className="font-medium text-sm truncate">{customer.firma}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {customer.strasse && `${customer.strasse}, `}
            {customer.plz} {customer.ort}
          </p>
        </div>
        {isInRoute ? (
          <Badge variant="secondary" className="text-xs shrink-0">In Route</Badge>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Shared List Content Component
function ListContent({
  showCustomers,
  setShowCustomers,
  routeWithStops,
  routeLoading,
  customersData,
  customersLoading,
  customerSearch,
  setCustomerSearch,
  selectedCustomerId,
  setSelectedCustomerId,
  selectedStopId,
  setSelectedStopId,
  handleAddCustomer,
  handleRemoveStop,
  handleDragEnd,
  sensors,
  arrivalTimes,
}: {
  showCustomers: boolean;
  setShowCustomers: (v: boolean) => void;
  routeWithStops: any;
  routeLoading: boolean;
  customersData: any;
  customersLoading: boolean;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  selectedCustomerId: number | null;
  setSelectedCustomerId: (v: number | null) => void;
  selectedStopId: string | null;
  setSelectedStopId: (v: string | null) => void;
  handleAddCustomer: (c: Customer) => void;
  handleRemoveStop: (id: string) => void;
  handleDragEnd: (e: DragEndEvent) => void;
  sensors: any;
  arrivalTimes: { arrival: string; driveTime: string }[];
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab Toggle */}
      <div className="p-2 border-b flex gap-1 shrink-0">
        <Button
          variant={!showCustomers ? 'default' : 'ghost'}
          size="sm"
          className="flex-1 gap-1"
          onClick={() => setShowCustomers(false)}
        >
          <Route className="h-4 w-4" />
          Route ({routeWithStops?.stops.length || 0})
        </Button>
        <Button
          variant={showCustomers ? 'default' : 'ghost'}
          size="sm"
          className="flex-1 gap-1"
          onClick={() => setShowCustomers(true)}
        >
          <Users className="h-4 w-4" />
          Kunden
        </Button>
      </div>

      {showCustomers ? (
        /* Customer List */
        <>
          <div className="p-2 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kunde suchen..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {customersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))
              ) : customersData?.customers.length ? (
                customersData.customers.map((customer: Customer) => (
                  <CustomerListItem
                    key={customer.kunden_nummer}
                    customer={customer}
                    isInRoute={routeWithStops?.stops.some((s: any) => s.kunden_nummer === customer.kunden_nummer) || false}
                    isSelected={selectedCustomerId === customer.kunden_nummer}
                    onAdd={() => handleAddCustomer(customer)}
                    onSelect={() => setSelectedCustomerId(customer.kunden_nummer)}
                  />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Keine Kunden gefunden
                </div>
              )}
            </div>
          </ScrollArea>
          {selectedCustomerId && (
            <div className="p-2 border-t shrink-0">
              <Button
                className="w-full gap-2"
                onClick={() => {
                  const customer = customersData?.customers.find((c: Customer) => c.kunden_nummer === selectedCustomerId);
                  if (customer) handleAddCustomer(customer);
                }}
              >
                <Plus className="h-4 w-4" />
                Zur Route hinzufügen
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Route Stops */
        <>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {routeLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))
              ) : routeWithStops?.stops.length ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={routeWithStops.stops.map((s: any) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {routeWithStops.stops.map((stop: RouteStopWithCustomer, index: number) => (
                      <SortableStopItem
                        key={stop.id}
                        stop={stop}
                        index={index}
                        onRemove={() => handleRemoveStop(stop.id)}
                        isSelected={selectedStopId === stop.id}
                        onSelect={() => setSelectedStopId(stop.id)}
                        arrivalTime={arrivalTimes[index]?.arrival}
                        driveTime={arrivalTimes[index]?.driveTime}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Keine Stops in der Route</p>
                  <p className="text-xs mt-1">Wechsle zu Kunden um welche hinzuzufügen</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Selected Stop Details */}
          {selectedStopId && routeWithStops?.stops && (
            <div className="p-3 border-t bg-muted/30 shrink-0">
              {(() => {
                const stop = routeWithStops.stops.find((s: any) => s.id === selectedStopId);
                if (!stop?.customer) return null;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{stop.customer.firma}</h4>
                      <span className="text-xs text-muted-foreground">
                        #{stop.customer.kunden_nummer}
                      </span>
                    </div>
                    {stop.customer.contact && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {stop.customer.contact}
                      </div>
                    )}
                    {stop.customer.telefon && (
                      <a
                        href={`tel:${stop.customer.telefon}`}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {stop.customer.telefon}
                      </a>
                    )}
                    <OpeningHoursDisplay customer={stop.customer} compact />
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function RouteMapView({ routeId, onBack }: RouteMapViewProps) {
  const { rep } = useAuth();
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [showCustomers, setShowCustomers] = useState(true);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [legDurations, setLegDurations] = useState<LegDuration[]>([]);
  const [startTime, setStartTime] = useState<string>('');
  const startTimeRef = useRef<NodeJS.Timeout>();

  const { data: routeWithStops, isLoading: routeLoading } = useRouteWithStops(routeId);
  const { data: customersData, isLoading: customersLoading } = useCustomers(
    { repId: rep?.rep_id, searchTerm: customerSearch },
    { page: 0, pageSize: 100 }
  );

  const addStop = useAddStop();
  const removeStop = useRemoveStop();
  const reorderStops = useReorderStops();
  const updateRoute = useUpdateRoute();

  // Startzeit aus DB laden
  useEffect(() => {
    if (routeWithStops?.start_time) {
      // Format: "HH:MM:SS" -> "HH:MM"
      setStartTime(routeWithStops.start_time.slice(0, 5));
    }
  }, [routeWithStops?.start_time]);

  // Startzeit speichern (mit Debounce)
  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    if (startTimeRef.current) clearTimeout(startTimeRef.current);
    startTimeRef.current = setTimeout(() => {
      updateRoute.mutate({
        id: routeId,
        start_time: value ? `${value}:00` : null,
      });
    }, 500);
  };

  // Ankunftszeiten berechnen
  const arrivalTimes = useMemo(() => {
    if (!startTime || !routeWithStops?.stops.length) return [];

    const visitDuration = routeWithStops.default_visit_duration || 20;
    const times: { arrival: string; driveTime: string }[] = [];
    const [hours, minutes] = startTime.split(':').map(Number);
    let currentTime = hours * 60 + minutes; // in Minuten

    routeWithStops.stops.forEach((_, index) => {
      // Fahrzeit zum aktuellen Stop (der erste Stop hat die Fahrzeit vom Start)
      const driveSeconds = index === 0 ? 0 : (legDurations[index - 1]?.durationSeconds || 0);
      const driveMinutes = Math.ceil(driveSeconds / 60);
      currentTime += driveMinutes;

      // Ankunftszeit formatieren
      const arrivalHours = Math.floor(currentTime / 60) % 24;
      const arrivalMins = currentTime % 60;
      const arrivalStr = `${arrivalHours.toString().padStart(2, '0')}:${arrivalMins.toString().padStart(2, '0')}`;

      // Fahrzeit Text
      const driveText = index === 0 ? '' : legDurations[index - 1]?.durationText || '';

      times.push({ arrival: arrivalStr, driveTime: driveText });

      // Aufenthalt addieren für nächsten Stop
      currentTime += visitDuration;
    });

    return times;
  }, [startTime, legDurations, routeWithStops]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !routeWithStops) return;

    const oldIndex = routeWithStops.stops.findIndex(s => s.id === active.id);
    const newIndex = routeWithStops.stops.findIndex(s => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newStops = arrayMove(routeWithStops.stops, oldIndex, newIndex);

    try {
      await reorderStops.mutateAsync({
        routeId,
        stopIds: newStops.map(s => s.id),
      });
    } catch {
      toast.error('Fehler beim Sortieren');
    }
  };

  const handleAddCustomer = async (customer: Customer) => {
    if (routeWithStops?.stops.some(s => s.kunden_nummer === customer.kunden_nummer)) {
      toast.error('Kunde bereits in Route');
      return;
    }

    try {
      await addStop.mutateAsync({
        routeId,
        kundenNummer: customer.kunden_nummer,
        stopOrder: (routeWithStops?.stops.length || 0) + 1,
      });
      toast.success(`${customer.firma} hinzugefügt`);
      setSelectedCustomerId(null);
    } catch {
      toast.error('Fehler beim Hinzufügen');
    }
  };

  const handleRemoveStop = async (stopId: string) => {
    try {
      await removeStop.mutateAsync({ stopId, routeId });
      toast.success('Stopp entfernt');
      setSelectedStopId(null);
    } catch {
      toast.error('Fehler beim Entfernen');
    }
  };

  const openGoogleMapsNavigation = () => {
    if (!routeWithStops?.stops.length) return;

    const stopsWithAddress = routeWithStops.stops.filter(
      s => s.customer?.strasse || s.customer?.ort
    );

    if (stopsWithAddress.length === 0) {
      toast.error('Keine Adressen vorhanden');
      return;
    }

    const addresses = stopsWithAddress.map(s => {
      const parts = [s.customer?.strasse, s.customer?.plz, s.customer?.ort].filter(Boolean);
      return encodeURIComponent(parts.join(', '));
    });

    const origin = addresses[0];
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(1, -1).join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
    url += '&travelmode=driving';

    window.open(url, '_blank');
  };

  const routeStats = routeWithStops?.stops.length
    ? { stops: routeWithStops.stops.length }
    : null;

  const listContentProps = {
    showCustomers,
    setShowCustomers,
    routeWithStops,
    routeLoading,
    customersData,
    customersLoading,
    customerSearch,
    setCustomerSearch,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedStopId,
    setSelectedStopId,
    handleAddCustomer,
    handleRemoveStop,
    handleDragEnd,
    sensors,
    arrivalTimes,
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="p-3 md:p-4 border-b bg-background flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-semibold truncate">{routeWithStops?.name || 'Route'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Startzeit */}
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Input
              type="time"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-[70px] sm:w-24 h-8 text-sm"
              placeholder="Start"
            />
          </div>
          {routeStats && (
            <Badge variant="outline" className="hidden lg:flex gap-1">
              <MapPin className="h-3 w-3" />
              {routeStats.stops}
            </Badge>
          )}
          <Button
            onClick={openGoogleMapsNavigation}
            disabled={!routeWithStops?.stops.length}
            size="sm"
            className="gap-1 shrink-0"
          >
            <Navigation className="h-4 w-4" />
            <span className="hidden lg:inline">Navigation</span>
          </Button>
        </div>
      </div>

      {/* Desktop: Split View */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 lg:w-80 xl:w-96 border-r flex flex-col bg-background overflow-hidden">
          <ListContent {...listContentProps} />
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 relative">
          <GoogleMapsProvider>
            <RouteMap
              stops={routeWithStops?.stops || []}
              availableCustomers={showCustomers ? customersData?.customers || [] : []}
              onCustomerClick={(customer) => {
                setSelectedCustomerId(customer.kunden_nummer);
                setShowCustomers(true);
              }}
              onStopClick={(stop) => {
                setSelectedStopId(stop.id);
                setShowCustomers(false);
              }}
              onDurationsCalculated={setLegDurations}
              selectedCustomerId={selectedCustomerId}
              showRoute={!showCustomers}
              className="w-full h-full"
            />
          </GoogleMapsProvider>
        </div>
      </div>

      {/* Mobile: Tab View */}
      <div className="flex-1 flex flex-col md:hidden overflow-hidden">
        {/* Mobile Tab Bar */}
        <div className="p-2 border-b flex gap-2 bg-background shrink-0">
          <Button
            variant={mobileView === 'map' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 gap-1"
            onClick={() => setMobileView('map')}
          >
            <Map className="h-4 w-4" />
            Karte
          </Button>
          <Button
            variant={mobileView === 'list' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 gap-1"
            onClick={() => setMobileView('list')}
          >
            <List className="h-4 w-4" />
            Liste
          </Button>
        </div>

        {/* Mobile Content */}
        {mobileView === 'map' ? (
          <div className="flex-1 relative">
            <GoogleMapsProvider>
              <RouteMap
                stops={routeWithStops?.stops || []}
                availableCustomers={customersData?.customers || []}
                onCustomerClick={(customer) => {
                  setSelectedCustomerId(customer.kunden_nummer);
                  setShowCustomers(true);
                  setMobileView('list');
                }}
                onStopClick={(stop) => {
                  setSelectedStopId(stop.id);
                  setShowCustomers(false);
                  setMobileView('list');
                }}
                onDurationsCalculated={setLegDurations}
                selectedCustomerId={selectedCustomerId}
                showRoute={true}
                className="w-full h-full"
              />
            </GoogleMapsProvider>

            {/* Floating Action Button für Route-Übersicht */}
            {routeWithStops?.stops.length ? (
              <Button
                className="absolute bottom-4 left-4 shadow-lg gap-2"
                onClick={() => {
                  setShowCustomers(false);
                  setMobileView('list');
                }}
              >
                <Route className="h-4 w-4" />
                {routeWithStops.stops.length} Stops
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ListContent {...listContentProps} />
          </div>
        )}
      </div>
    </div>
  );
}
