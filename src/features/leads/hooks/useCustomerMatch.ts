import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "./useLeads";

interface MatchedCustomer {
  kunden_nummer: number;
  firma: string;
  ort: string | null;
}

// Normalisiert Text für Vergleich: lowercase, kein Sonderzeichen, einfache Leerzeichen
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-zäöüß0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Prüft ob zwei Strings ähnlich genug sind
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
        .select("kunden_nummer, firma, ort")
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
      for (const customer of customers) {
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
