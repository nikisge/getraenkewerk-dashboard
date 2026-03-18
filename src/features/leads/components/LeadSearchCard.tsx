import { Card, CardContent } from "@/shared/components/ui/card";
import { Search, MapPin, Hash } from "lucide-react";
import { LeadSearch } from "../hooks/useLeadSearches";

interface LeadSearchCardProps {
  search: LeadSearch;
  onClick: (searchId: number) => void;
  isActive?: boolean;
}

export function LeadSearchCard({ search, onClick, isActive }: LeadSearchCardProps) {
  const placeIds = search.found_place_ids as string[] | null;
  const totalLeads = placeIds?.length || search.result_count || 0;
  const newLeads = search.new_leads_count ?? 0;
  const duplicates = totalLeads - newLeads;

  return (
    <Card
      className={`cursor-pointer hover:bg-muted/50 transition-colors ${isActive ? "ring-2 ring-primary" : ""}`}
      onClick={() => onClick(search.id)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <span className="font-semibold">{search.search_term}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {search.location}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Hash className="h-3.5 w-3.5" />
            {totalLeads} Leads
            {duplicates > 0 && (
              <span className="text-xs">({newLeads} neu)</span>
            )}
          </span>
          <span className="text-muted-foreground">
            {new Date(search.created_at).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
