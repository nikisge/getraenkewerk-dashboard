import { useEffect, useState, useRef } from 'react';
import { Map as GoogleMap, useMap, useMapsLibrary, AdvancedMarker } from '@vis.gl/react-google-maps';
import { RouteStopWithCustomer } from '../hooks/useRoutes';
import { Customer } from '@/features/customers/hooks/useCustomers';
import { geocodeAddress } from '../services/geocodingService';
import { supabase } from '@/integrations/supabase/client';

// Deutschland Zentrum
const DEFAULT_CENTER = { lat: 51.1657, lng: 10.4515 };
const DEFAULT_ZOOM = 6;

// Globaler Cache - bleibt während der ganzen Session
const coordsCache = new Map<number, { lat: number; lng: number }>();

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
}: RouteMapProps) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [, forceUpdate] = useState(0);
  const geocodingInProgress = useRef(new Set<number>());
  const hasFittedBounds = useRef(false);

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
    // Nur die ersten 30 geocoden für Performance
    const toGeocode = customers.slice(0, 30);

    // Parallel geocoden (5 gleichzeitig)
    const batchSize = 5;
    for (let i = 0; i < toGeocode.length; i += batchSize) {
      const batch = toGeocode.slice(i, i + batchSize);

      await Promise.all(batch.map(async (customer) => {
        const kundenNr = customer.kunden_nummer;

        // Bereits im Gange oder fertig?
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
            // In Cache speichern
            coordsCache.set(kundenNr, {
              lat: result.latitude,
              lng: result.longitude
            });

            // In DB speichern (fire & forget)
            supabase
              .from('dim_customers')
              .update({ latitude: result.latitude, longitude: result.longitude })
              .eq('kunden_nummer', kundenNr)
              .then(() => {});

            // Update UI
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
        strokeColor: '#3b82f6',
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    setDirectionsRenderer(renderer);

    return () => {
      renderer.setMap(null);
    };
  }, [routesLibrary, map]);

  // Calculate and display route
  useEffect(() => {
    if (!directionsRenderer || !routesLibrary || !showRoute || stops.length < 2) {
      directionsRenderer?.setDirections({ routes: [] } as any);
      return;
    }

    const validStops = stops.filter(s => {
      if (!s.customer) return false;
      return coordsCache.has(s.customer.kunden_nummer);
    });

    if (validStops.length < 2) return;

    const directionsService = new routesLibrary.DirectionsService();

    const getCoords = (stop: RouteStopWithCustomer) =>
      coordsCache.get(stop.customer!.kunden_nummer)!;

    const origin = getCoords(validStops[0]);
    const destination = getCoords(validStops[validStops.length - 1]);
    const waypoints = validStops.slice(1, -1).map(s => ({
      location: getCoords(s),
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

          // Fahrzeiten extrahieren und nach oben geben
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
      if (s.customer && coordsCache.has(s.customer.kunden_nummer)) {
        allCoords.push(coordsCache.get(s.customer.kunden_nummer)!);
      }
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

  // Zähle wie viele Koordinaten geladen werden
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
          if (!stop.customer) return null;
          const coords = coordsCache.get(stop.customer.kunden_nummer);
          if (!coords) return null;

          return (
            <AdvancedMarker
              key={stop.id}
              position={coords}
              onClick={() => onStopClick?.(stop)}
              title={stop.customer?.firma || 'Stopp'}
            >
              <div className="relative cursor-pointer transform hover:scale-110 transition-transform">
                <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">
                  {index + 1}
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Available Customer Markers */}
        {availableCustomers.map(customer => {
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

      {/* Loading Indicator (klein, nicht blockierend) */}
      {loadingCount > 0 && (
        <div className="absolute top-2 right-2 bg-background/90 px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 text-xs">
          <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
          <span>Lade {loadingCount}...</span>
        </div>
      )}
    </div>
  );
}
