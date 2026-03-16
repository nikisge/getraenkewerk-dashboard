import { TablesInsert } from "@/integrations/supabase/types";

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN;
const APIFY_ENDPOINT =
  "https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items";

interface ApifyPlace {
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
    status: "neu",
  };
}

export async function searchGoogleMaps(
  searchTerm: string,
  location: string,
  maxResults: number
): Promise<ApifyPlace[]> {
  if (!APIFY_TOKEN || APIFY_TOKEN === "DEIN_APIFY_TOKEN_HIER") {
    throw new Error(
      "Apify Token nicht konfiguriert. Bitte VITE_APIFY_TOKEN in .env setzen."
    );
  }

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
