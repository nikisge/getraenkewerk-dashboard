import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { ExternalLink, Star, UserCheck } from "lucide-react";
import { Lead, useUpdateLeadStatus, LeadStatus } from "../hooks/useLeads";
import { useCustomerMatch, CustomerMatchResult } from "../hooks/useCustomerMatch";
import { LeadStatusSelect } from "./LeadStatusSelect";
import { LeadDetailDialog } from "./LeadDetailDialog";
import { toast } from "sonner";

interface LeadSearchResultsProps {
  leads: Lead[];
  isLoading?: boolean;
}

function ExistingCustomerBadge({ match }: { match: CustomerMatchResult }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={
            match.confidence === "hoch"
              ? "border-amber-500 text-amber-600 bg-amber-50 cursor-help"
              : "border-yellow-400 text-yellow-600 bg-yellow-50 cursor-help"
          }
        >
          <UserCheck className="h-3 w-3 mr-1" />
          Bereits Kunde
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{match.firma}</p>
        <p className="text-xs">Kd.-Nr: {match.kunden_nummer}</p>
        {match.ort && <p className="text-xs">{match.ort}</p>}
        <p className="text-xs mt-1">
          Übereinstimmung: {match.confidence === "hoch" ? "Hoch (Name + Ort)" : "Mittel (Name)"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function LeadSearchResults({ leads, isLoading }: LeadSearchResultsProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const updateStatus = useUpdateLeadStatus();
  const customerMatches = useCustomerMatch(leads);

  const handleStatusChange = (leadId: number, status: LeadStatus) => {
    updateStatus.mutate(
      { leadId, status },
      {
        onSuccess: () => toast.success("Status aktualisiert"),
        onError: () => toast.error("Fehler beim Aktualisieren"),
      }
    );
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Laden...</div>;
  }

  if (leads.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Keine Leads gefunden</div>;
  }

  const matchCount = customerMatches.size;

  return (
    <>
      {matchCount > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <UserCheck className="h-4 w-4 inline mr-2" />
          {matchCount} von {leads.length} Leads sind wahrscheinlich bereits Kunden.
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Bewertung</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const match = customerMatches.get(lead.id);
              return (
                <TableRow
                  key={lead.id}
                  className={`cursor-pointer hover:bg-muted/50 ${match ? "bg-amber-50/50" : ""}`}
                  onClick={() => setSelectedLead(lead)}
                >
                  <TableCell className="font-medium max-w-[250px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{lead.name}</span>
                      {match && <ExistingCustomerBadge match={match} />}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-sm">
                    {lead.address || "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.phone}
                      </a>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {lead.rating ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        {lead.rating}
                        <span className="text-muted-foreground">({lead.rating_count})</span>
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">
                    {lead.category || "-"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <LeadStatusSelect
                      value={lead.status}
                      onChange={(status) => handleStatusChange(lead.id, status)}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {lead.google_maps_url && (
                      <a
                        href={lead.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {leads.map((lead) => {
          const match = customerMatches.get(lead.id);
          return (
            <div
              key={lead.id}
              className={`border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors ${match ? "border-amber-300 bg-amber-50/50" : ""}`}
              onClick={() => setSelectedLead(lead)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">{lead.name}</p>
                  {lead.category && (
                    <p className="text-xs text-muted-foreground">{lead.category}</p>
                  )}
                  {match && (
                    <div className="mt-1">
                      <ExistingCustomerBadge match={match} />
                    </div>
                  )}
                </div>
                {lead.rating && (
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    {lead.rating}
                  </span>
                )}
              </div>
              {lead.address && (
                <p className="text-sm text-muted-foreground mb-2">{lead.address}</p>
              )}
              <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <LeadStatusSelect
                  value={lead.status}
                  onChange={(status) => handleStatusChange(lead.id, status)}
                />
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {lead.phone}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <LeadDetailDialog
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        customerMatch={selectedLead ? customerMatches.get(selectedLead.id) : undefined}
      />
    </>
  );
}
