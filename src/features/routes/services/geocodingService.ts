import { supabase } from '@/integrations/supabase/client';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

// Cache für Geocoding-Ergebnisse während der Session
const geocodeCache = new Map<string, GeocodingResult>();

/**
 * Geocodiert eine Adresse mit Google Maps Geocoding API
 * Nutzt die global geladene Google Maps API
 */
export async function geocodeAddress(
  street: string | null,
  postalCode: string | null,
  city: string | null
): Promise<GeocodingResult | null> {
  // Adresse zusammenbauen
  const addressParts = [street, postalCode, city].filter(Boolean);
  if (addressParts.length === 0) return null;

  const address = addressParts.join(', ') + ', Deutschland';

  // Check cache
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address)!;
  }

  // Warte bis Google Maps API geladen ist
  if (typeof google === 'undefined' || !google.maps) {
    console.warn('Google Maps API noch nicht geladen');
    return null;
  }

  try {
    const geocoder = new google.maps.Geocoder();

    const response = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          resolve(results);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });

    const location = response[0].geometry.location;
    const result: GeocodingResult = {
      latitude: location.lat(),
      longitude: location.lng(),
      formattedAddress: response[0].formatted_address,
    };

    // Cache result
    geocodeCache.set(address, result);

    return result;
  } catch (error) {
    console.error('Geocoding error for address:', address, error);
    return null;
  }
}

/**
 * Geocodiert einen Kunden und speichert die Koordinaten in der Datenbank
 */
export async function geocodeAndSaveCustomer(
  kundenNummer: number,
  street: string | null,
  postalCode: string | null,
  city: string | null
): Promise<GeocodingResult | null> {
  const result = await geocodeAddress(street, postalCode, city);

  if (result) {
    // Speichere in Datenbank
    const { error } = await supabase
      .from('dim_customers')
      .update({
        latitude: result.latitude,
        longitude: result.longitude,
      })
      .eq('kunden_nummer', kundenNummer);

    if (error) {
      console.error('Failed to save coordinates:', error);
    }
  }

  return result;
}

/**
 * Geocodiert mehrere Kunden gleichzeitig (mit Rate-Limiting)
 */
export async function geocodeMultipleCustomers(
  customers: Array<{
    kunden_nummer: number;
    strasse: string | null;
    plz: string | null;
    ort: string | null;
  }>
): Promise<Map<number, GeocodingResult>> {
  const results = new Map<number, GeocodingResult>();

  // Rate limiting: max 10 requests per second für Google Geocoding
  for (const customer of customers) {
    const result = await geocodeAddress(customer.strasse, customer.plz, customer.ort);
    if (result) {
      results.set(customer.kunden_nummer, result);

      // Speichern in DB
      await supabase
        .from('dim_customers')
        .update({
          latitude: result.latitude,
          longitude: result.longitude,
        })
        .eq('kunden_nummer', customer.kunden_nummer);
    }

    // Kleine Pause zwischen Requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Prüft ob Koordinaten für einen Kunden fehlen und geocodiert wenn nötig
 */
export async function ensureCustomerCoordinates(
  kundenNummer: number,
  latitude: number | null,
  longitude: number | null,
  street: string | null,
  postalCode: string | null,
  city: string | null
): Promise<{ latitude: number; longitude: number } | null> {
  // Wenn Koordinaten schon vorhanden, nutze diese
  if (latitude != null && longitude != null) {
    return { latitude, longitude };
  }

  // Sonst geocodieren
  const result = await geocodeAndSaveCustomer(kundenNummer, street, postalCode, city);
  return result ? { latitude: result.latitude, longitude: result.longitude } : null;
}
