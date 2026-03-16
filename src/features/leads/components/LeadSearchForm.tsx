import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Search, Loader2 } from "lucide-react";

interface LeadSearchFormProps {
  onSearch: (searchTerm: string, location: string, maxResults: number) => void;
  isLoading: boolean;
}

export function LeadSearchForm({ onSearch, isLoading }: LeadSearchFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState("50");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || !location.trim()) return;
    onSearch(searchTerm.trim(), location.trim(), parseInt(maxResults));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Suchbegriff</label>
          <Input
            placeholder="z.B. Grieche, Italiener, Bar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Ort / Gebiet</label>
          <Input
            placeholder="z.B. Hamburg, Berlin Mitte..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Max. Ergebnisse</label>
          <Select value={maxResults} onValueChange={setMaxResults} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !searchTerm.trim() || !location.trim()}
        className="w-full md:w-auto"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Suche läuft...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Suche starten
          </>
        )}
      </Button>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Google Maps wird durchsucht — kann je nach Ergebnisanzahl 1–3 Minuten dauern.
        </p>
      )}
    </form>
  );
}
