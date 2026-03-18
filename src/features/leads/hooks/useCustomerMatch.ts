import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "./useLeads";

interface MatchedCustomer {
  kunden_nummer: number;
  firma: string;
  ort: string | null;
  strasse: string | null;
  plz: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Normalisiert Text für Vergleich: lowercase, kein Sonderzeichen, einfache Leerzeichen
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-zäöüß0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Haversine-Distanz in Metern
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Erdradius in Metern
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Prüft ob zwei Strings ähnlich genug sind (Name-Match)
function isFuzzyMatch(leadName: string, customerFirma: string): boolean {
  const a = normalize(leadName);
  const b = normalize(customerFirma);
  if (!a || !b || a.length < 3 || b.length < 3) return false;

  // Exakter Match nach Normalisierung
  if (a === b) return true;

  // Einer enthält den anderen (z.B. "Taverna Olympia" ↔ "Taverna Olympia GmbH")
  if (a.includes(b) || b.includes(a)) return true;

  // Wort-basierter Match: mindestens 2 gemeinsame Wörter mit je 4+ Zeichen
  const wordsA = a.split(" ").filter((w) => w.length >= 4);
  const wordsB = b.split(" ").filter((w) => w.length >= 4);
  const commonWords = wordsA.filter((w) => wordsB.includes(w));
  if (commonWords.length >= 2) return true;

  return false;
}

// Prüft ob Adresse des Leads zur Kundenadresse passt
function addressMatches(
  leadAddress: string | null,
  leadPlz: string | null,
  customerStrasse: string | null,
  customerPlz: string | null
): boolean {
  if (!leadAddress || !customerStrasse || !customerPlz) return false;

  // PLZ muss übereinstimmen
  const leadPlzValue = leadPlz || "";
  if (leadPlzValue !== customerPlz) return false;

  // Straßenname im Lead-Adressfeld enthalten
  const normalizedAddress = normalize(leadAddress);
  const normalizedStrasse = normalize(customerStrasse);
  // Nur Straßennamen (ohne Hausnummer) vergleichen — mindestens 5 Zeichen
  if (normalizedStrasse.length >= 5 && normalizedAddress.includes(normalizedStrasse)) {
    return true;
  }

  return false;
}

// Zusätzliche Bestätigung über Stadt
function cityMatches(leadAddress: string | null, customerOrt: string | null): boolean {
  if (!leadAddress || !customerOrt) return false;
  return normalize(leadAddress).includes(normalize(customerOrt));
}

function useExistingCustomers() {
  return useQuery({
    queryKey: ["dim_customers_for_matching"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_customers")
        .select("kunden_nummer, firma, ort, strasse, plz, latitude, longitude")
        .eq("status_active", true);
      if (error) throw error;
      return data as MatchedCustomer[];
    },
    staleTime: 5 * 60 * 1000, // 5 Min Cache
  });
}

export interface CustomerMatchResult {
  kunden_nummer: number;
  firma: string;
  ort: string | null;
  confidence: "hoch" | "mittel";
}

export function useCustomerMatch(leads: Lead[]) {
  const { data: customers } = useExistingCustomers();

  const matches = useMemo(() => {
    if (!customers || !leads.length) return new Map<number, CustomerMatchResult>();

    const result = new Map<number, CustomerMatchResult>();

    for (const lead of leads) {
      // Bereits gefunden? Skip
      if (result.has(lead.id)) continue;

      for (const customer of customers) {
        // 1. Koordinaten-Nähe: < 100m = hohe Konfidenz
        if (
          lead.latitude != null && lead.longitude != null &&
          customer.latitude != null && customer.longitude != null
        ) {
          const dist = haversineDistance(
            lead.latitude, lead.longitude,
            customer.latitude, customer.longitude
          );
          if (dist < 100) {
            result.set(lead.id, {
              kunden_nummer: customer.kunden_nummer,
              firma: customer.firma || "",
              ort: customer.ort,
              confidence: "hoch",
            });
            break;
          }
        }

        // 2. Adress-Match: Straße + PLZ = hohe Konfidenz
        if (addressMatches(lead.address, lead.plz, customer.strasse, customer.plz)) {
          result.set(lead.id, {
            kunden_nummer: customer.kunden_nummer,
            firma: customer.firma || "",
            ort: customer.ort,
            confidence: "hoch",
          });
          break;
        }

        // 3. Name + Stadt Fallback (bisherige Logik)
        if (!customer.firma) continue;
        const nameMatch = isFuzzyMatch(lead.name, customer.firma);
        if (!nameMatch) continue;

        const cityMatch = cityMatches(lead.address, customer.ort);

        result.set(lead.id, {
          kunden_nummer: customer.kunden_nummer,
          firma: customer.firma,
          ort: customer.ort,
          confidence: cityMatch ? "hoch" : "mittel",
        });
        break; // Erster Treffer reicht
      }
    }

    return result;
  }, [leads, customers]);

  return matches;
}
