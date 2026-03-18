import { TablesInsert } from "@/integrations/supabase/types";

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN;
const APIFY_ENDPOINT =
  "https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items";

// PLZ aus Adresse extrahieren (deutsches Format: "Straße Nr, XXXXX Ort")
export function extractPlz(address: string | null | undefined): string | null {
  if (!address) return null;
  const match = address.match(/(\d{5})/);
  return match ? match[1] : null;
}

export interface ApifyPlace {
  placeId?: string;
  title?: string;
  address?: string;
  phone?: string;
  website?: string;
  totalScore?: number;
  reviewsCount?: number;
  categoryName?: string;
  url?: string;
  location?: { lat?: number; lng?: number };
}

export function mapApifyToLead(
  place: ApifyPlace,
  searchId: number
): TablesInsert<"gw_leads"> {
  return {
    search_id: searchId,
    place_id: place.placeId || null,
    name: place.title || "Unbekannt",
    address: place.address || null,
    phone: place.phone || null,
    website: place.website || null,
    rating: place.totalScore ?? null,
    rating_count: place.reviewsCount ?? null,
    category: place.categoryName || null,
    google_maps_url: place.url || null,
    latitude: place.location?.lat ?? null,
    longitude: place.location?.lng ?? null,
    plz: extractPlz(place.address),
    status: "neu",
  };
}

// Einzelner Apify-Call mit gegebenem Limit
async function callApify(
  searchTerm: string,
  location: string,
  maxResults: number
): Promise<ApifyPlace[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const response = await fetch(
      `${APIFY_ENDPOINT}?token=${APIFY_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchStringsArray: [searchTerm],
          locationQuery: `${location}, Deutschland`,
          maxCrawledPlacesPerSearch: maxResults,
          language: "de",
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Apify Fehler (${response.status}): ${text}`);
    }

    return (await response.json()) as ApifyPlace[];
  } finally {
    clearTimeout(timeout);
  }
}

export interface SmartSearchResult {
  allPlaces: ApifyPlace[];     // Alle gefundenen (inkl. bekannte)
  newPlaces: ApifyPlace[];     // Nur die neuen
  totalApiResults: number;     // Wie viele Apify insgesamt geliefert hat
  apiCalls: number;            // Anzahl API-Calls
  exhausted: boolean;          // Google Maps hat keine weiteren Ergebnisse mehr
}

/**
 * Smarte Suche: Holt Ergebnisse in Batches, filtert bekannte raus,
 * holt nach bis gewünschte Anzahl neuer Leads erreicht ist.
 *
 * Ablauf:
 * 1. Erste Suche mit gewünschter Anzahl
 * 2. Bekannte Place-IDs rausfiltern
 * 3. Wenn zu wenig neue: nächste Runde mit höherem Limit
 * 4. Stopp wenn: genug neue ODER Google hat keine weiteren ODER max 3 Runden
 */
export async function searchGoogleMapsSmart(
  searchTerm: string,
  location: string,
  desiredNewResults: number,
  knownPlaceIds: Set<string>,
  onProgress?: (msg: string) => void,
): Promise<SmartSearchResult> {
  if (!APIFY_TOKEN || APIFY_TOKEN === "DEIN_APIFY_TOKEN_HIER") {
    throw new Error(
      "Apify Token nicht konfiguriert. Bitte VITE_APIFY_TOKEN in .env setzen."
    );
  }

  const allFound = new Map<string, ApifyPlace>(); // placeId → place (dedup)
  const newPlaces: ApifyPlace[] = [];
  let apiCalls = 0;
  let currentLimit = desiredNewResults;
  const MAX_ROUNDS = 3;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    onProgress?.(
      round === 0
        ? `Suche läuft (${currentLimit} Ergebnisse)...`
        : `Hole weitere Ergebnisse (Runde ${round + 1}, ${currentLimit} angefragt)...`
    );

    const places = await callApify(searchTerm, location, currentLimit);
    apiCalls++;

    // Neue Places identifizieren
    let newInThisRound = 0;
    for (const place of places) {
      const pid = place.placeId;
      if (!pid || allFound.has(pid)) continue;
      allFound.set(pid, place);

      if (!knownPlaceIds.has(pid)) {
        newPlaces.push(place);
        newInThisRound++;
      }
    }

    // Genug neue gefunden?
    if (newPlaces.length >= desiredNewResults) break;

    // Google hat weniger geliefert als angefragt → keine weiteren vorhanden
    if (places.length < currentLimit) {
      break;
    }

    // Nächste Runde: Limit erhöhen um die Differenz + bekannte
    const stillNeeded = desiredNewResults - newPlaces.length;
    // Schätze wie viele wir brauchen: noch fehlende + bereits bekannte als Buffer
    currentLimit = Math.min(
      currentLimit + stillNeeded + knownPlaceIds.size,
      200 // Absolutes Maximum um Kosten zu begrenzen
    );

    // Wenn diese Runde 0 neue gebracht hat, bringt Erhöhung wahrscheinlich auch nichts
    if (newInThisRound === 0) break;
  }

  return {
    allPlaces: Array.from(allFound.values()),
    newPlaces,
    totalApiResults: allFound.size,
    apiCalls,
    exhausted: newPlaces.length < desiredNewResults,
  };
}
