import { useEffect, useState, useRef } from 'react';
import { Map as GoogleMap, useMap, useMapsLibrary, AdvancedMarker } from '@vis.gl/react-google-maps';
import { RouteStopWithCustomer } from '../hooks/useRoutes';
import { Customer } from '@/features/customers/hooks/useCustomers';
import { geocodeAddress } from '../services/geocodingService';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2 } from 'lucide-react';

// Deutschland Zentrum
const DEFAULT_CENTER = { lat: 51.1657, lng: 10.4515 };
const DEFAULT_ZOOM = 6;

// Globaler Cache - bleibt während der ganzen Session
const coordsCache = new Map<number, { lat: number; lng: number }>();
// Separater Cache für Lead-Koordinaten (Key: lead_id als negative Zahl um Kollision zu vermeiden)
const leadCoordsCache = new Map<number, { lat: number; lng: number }>();

// Fahrzeit-Informationen zwischen Stops
export interface LegDuration {
  durationSeconds: number;
  durationText: string;
}

interface RouteMapProps {
  stops: RouteStopWithCustomer[];
  availableCustomers?: Customer[];
  onCustomerClick?: (customer: Customer) => void;
  onStopClick?: (stop: RouteStopWithCustomer) => void;
  onDurationsCalculated?: (durations: LegDuration[]) => void;
  showRoute?: boolean;
  selectedCustomerId?: number | null;
  className?: string;
  isLeadRoute?: boolean;
}

export function RouteMap({
  stops,
  availableCustomers = [],
  onCustomerClick,
  onStopClick,
  onDurationsCalculated,
  showRoute = true,
  selectedCustomerId,
  className = '',
  isLeadRoute,
}: RouteMapProps) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [, forceUpdate] = useState(0);
  const geocodingInProgress = useRef(new Set<number>());
  const hasFittedBounds = useRef(false);

  // Koordinaten für einen Stop holen (Kunde oder Lead)
  const getStopCoords = (stop: RouteStopWithCustomer): { lat: number; lng: number } | null => {
    // Lead-Stop: Koordinaten direkt aus Lead-Daten
    if (stop.lead) {
      if (stop.lead.latitude != null && stop.lead.longitude != null) {
        return { lat: stop.lead.latitude, lng: stop.lead.longitude };
      }
      return null;
    }
    // Kunden-Stop: aus Cache
    if (stop.customer) {
      return coordsCache.get(stop.customer.kunden_nummer) || null;
    }
    return null;
  };

  // Sofort Koordinaten aus DB/Cache laden (ohne Geocoding)
  useEffect(() => {
    const loadFromDbAndCache = async () => {
      // Sammle alle Kunden-Nummern die Koordinaten brauchen
      const allCustomers = [
        ...stops.filter(s => s.customer).map(s => s.customer!),
        ...availableCustomers,
      ];

      const needsLoading: number[] = [];

      for (const customer of allCustomers) {
        const kundenNr = customer.kunden_nummer;

        // Schon im Cache?
        if (coordsCache.has(kundenNr)) continue;

        // Koordinaten aus DB vorhanden?
        if (customer.latitude != null && customer.longitude != null) {
          coordsCache.set(kundenNr, {
            lat: customer.latitude,
            lng: customer.longitude
          });
          continue;
        }

        needsLoading.push(kundenNr);
      }

      // Force re-render wenn Cache aktualisiert wurde
      forceUpdate(n => n + 1);

      // Geocoding im Hintergrund für fehlende (max 20 parallel)
      if (needsLoading.length > 0) {
        geocodeInBackground(allCustomers.filter(c => needsLoading.includes(c.kunden_nummer)));
      }
    };

    loadFromDbAndCache();
  }, [stops, availableCustomers]);

  // Geocoding im Hintergrund
  const geocodeInBackground = async (customers: Customer[]) => {
    const toGeocode = customers.slice(0, 30);

    const batchSize = 5;
    for (let i = 0; i < toGeocode.length; i += batchSize) {
      const batch = toGeocode.slice(i, i + batchSize);

      await Promise.all(batch.map(async (customer) => {
        const kundenNr = customer.kunden_nummer;

        if (geocodingInProgress.current.has(kundenNr) || coordsCache.has(kundenNr)) {
          return;
        }

        geocodingInProgress.current.add(kundenNr);

        try {
          const result = await geocodeAddress(
            customer.strasse ?? null,
            customer.plz ?? null,
            customer.ort ?? null
          );

          if (result) {
            coordsCache.set(kundenNr, {
              lat: result.latitude,
              lng: result.longitude
            });

            supabase
              .from('dim_customers')
              .update({ latitude: result.latitude, longitude: result.longitude })
              .eq('kunden_nummer', kundenNr)
              .then(() => {});

            forceUpdate(n => n + 1);
          }
        } catch (err) {
          console.error('Geocoding error:', err);
        } finally {
          geocodingInProgress.current.delete(kundenNr);
        }
      }));
    }
  };

  // Initialize DirectionsRenderer
  useEffect(() => {
    if (!routesLibrary || !map) return;

    const renderer = new routesLibrary.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: isLeadRoute ? '#f97316' : '#3b82f6',
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    setDirectionsRenderer(renderer);

    return () => {
      renderer.setMap(null);
    };
  }, [routesLibrary, map, isLeadRoute]);

  // Calculate and display route
  useEffect(() => {
    if (!directionsRenderer || !routesLibrary || !showRoute || stops.length < 2) {
      directionsRenderer?.setDirections({ routes: [] } as any);
      return;
    }

    const validStops = stops.filter(s => getStopCoords(s) !== null);

    if (validStops.length < 2) return;

    const directionsService = new routesLibrary.DirectionsService();

    const origin = getStopCoords(validStops[0])!;
    const destination = getStopCoords(validStops[validStops.length - 1])!;
    const waypoints = validStops.slice(1, -1).map(s => ({
      location: getStopCoords(s)!,
      stopover: true,
    }));

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);

          if (onDurationsCalculated && result.routes[0]?.legs) {
            const durations: LegDuration[] = result.routes[0].legs.map(leg => ({
              durationSeconds: leg.duration?.value || 0,
              durationText: leg.duration?.text || '',
            }));
            onDurationsCalculated(durations);
          }
        }
      }
    );
  }, [directionsRenderer, routesLibrary, stops, showRoute, onDurationsCalculated]);

  // Fit bounds einmalig
  useEffect(() => {
    if (!map || hasFittedBounds.current) return;

    const allCoords: { lat: number; lng: number }[] = [];

    stops.forEach(s => {
      const coords = getStopCoords(s);
      if (coords) allCoords.push(coords);
    });

    availableCustomers.forEach(c => {
      if (coordsCache.has(c.kunden_nummer)) {
        allCoords.push(coordsCache.get(c.kunden_nummer)!);
      }
    });

    if (allCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      allCoords.forEach(coord => bounds.extend(coord));

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50 });
        hasFittedBounds.current = true;
      }
    }
  }, [map, stops, availableCustomers]);

  const getAbcColor = (abcClass: string | null): string => {
    switch (abcClass) {
      case 'A': return '#22c55e';
      case 'B': return '#eab308';
      case 'C': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const loadingCount = geocodingInProgress.current.size;

  return (
    <div className={`relative ${className}`}>
      <GoogleMap
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        mapId="route-planning-map"
        gestureHandling="greedy"
        disableDefaultUI={false}
        zoomControl={true}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        className="w-full h-full rounded-lg"
      >
        {/* Stop Markers */}
        {stops.map((stop, index) => {
          const coords = getStopCoords(stop);
          if (!coords) return null;

          const isLead = !!stop.lead;
          const isVisited = !!stop.visited_at;
          const title = isLead ? stop.lead!.name : (stop.customer?.firma || 'Stopp');

          return (
            <AdvancedMarker
              key={stop.id}
              position={coords}
              onClick={() => onStopClick?.(stop)}
              title={title}
            >
              <div className="relative cursor-pointer transform hover:scale-110 transition-transform">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white ${
                  isVisited
                    ? 'bg-green-600 text-white'
                    : isLead
                      ? 'bg-orange-500 text-white'
                      : 'bg-primary text-primary-foreground'
                }`}>
                  {isVisited ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Available Customer Markers (nur bei Kunden-Routen) */}
        {!isLeadRoute && availableCustomers.map(customer => {
          if (stops.some(s => s.kunden_nummer === customer.kunden_nummer)) return null;

          const coords = coordsCache.get(customer.kunden_nummer);
          if (!coords) return null;

          const isSelected = selectedCustomerId === customer.kunden_nummer;

          return (
            <AdvancedMarker
              key={customer.kunden_nummer}
              position={coords}
              onClick={() => onCustomerClick?.(customer)}
              title={customer.firma || ''}
            >
              <div className={`cursor-pointer transform transition-all ${isSelected ? 'scale-125' : 'hover:scale-110'}`}>
                <div
                  className={`w-4 h-4 rounded-full shadow-md border-2 border-white ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  style={{ backgroundColor: getAbcColor(customer.abc_class) }}
                />
              </div>
            </AdvancedMarker>
          );
        })}
      </GoogleMap>

      {/* Loading Indicator */}
      {loadingCount > 0 && (
        <div className="absolute top-2 right-2 bg-background/90 px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 text-xs">
          <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
          <span>Lade {loadingCount}...</span>
        </div>
      )}
    </div>
  );
}
