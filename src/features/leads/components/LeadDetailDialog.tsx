import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { ExternalLink, Phone, Globe, MapPin, Star, UserCheck } from "lucide-react";
import { Lead, useUpdateLeadNotes } from "../hooks/useLeads";
import { LeadStatusSelect } from "./LeadStatusSelect";
import { useUpdateLeadStatus, LeadStatus } from "../hooks/useLeads";
import { CustomerMatchResult } from "../hooks/useCustomerMatch";
import { toast } from "sonner";

interface LeadDetailDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  customerMatch?: CustomerMatchResult;
}

export function LeadDetailDialog({ lead, isOpen, onClose, customerMatch }: LeadDetailDialogProps) {
  const [notes, setNotes] = useState("");
  const updateStatus = useUpdateLeadStatus();
  const updateNotes = useUpdateLeadNotes();

  const currentNotes = lead?.notes || "";

  const handleSaveNotes = () => {
    if (!lead) return;
    updateNotes.mutate(
      { leadId: lead.id, notes },
      {
        onSuccess: () => toast.success("Notizen gespeichert"),
        onError: () => toast.error("Fehler beim Speichern"),
      }
    );
  };

  const handleStatusChange = (status: LeadStatus) => {
    if (!lead) return;
    updateStatus.mutate(
      { leadId: lead.id, status },
      {
        onSuccess: () => toast.success("Status aktualisiert"),
        onError: () => toast.error("Fehler beim Aktualisieren"),
      }
    );
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{lead.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bereits Kunde Warnung */}
          {customerMatch && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                <UserCheck className="h-4 w-4" />
                Wahrscheinlich bereits Kunde
              </div>
              <div className="mt-1 text-sm text-amber-700">
                <span className="font-medium">{customerMatch.firma}</span>
                {" "} (Kd.-Nr: {customerMatch.kunden_nummer})
                {customerMatch.ort && <span> — {customerMatch.ort}</span>}
              </div>
              <Badge
                variant="outline"
                className="mt-2 text-xs border-amber-400 text-amber-600"
              >
                Übereinstimmung: {customerMatch.confidence === "hoch" ? "Hoch" : "Mittel"}
              </Badge>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <LeadStatusSelect value={lead.status} onChange={handleStatusChange} />
          </div>

          {/* Kategorie */}
          {lead.category && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Kategorie</span>
              <span className="text-sm">{lead.category}</span>
            </div>
          )}

          {/* Bewertung */}
          {lead.rating && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bewertung</span>
              <span className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                {lead.rating} ({lead.rating_count} Bewertungen)
              </span>
            </div>
          )}

          {/* Adresse */}
          {lead.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-sm">{lead.address}</span>
            </div>
          )}

          {/* Telefon */}
          {lead.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${lead.phone}`} className="text-sm text-primary hover:underline">
                {lead.phone}
              </a>
            </div>
          )}

          {/* Website */}
          {lead.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a
                href={lead.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate max-w-[300px]"
              >
                {lead.website}
              </a>
            </div>
          )}

          {/* Google Maps Link */}
          {lead.google_maps_url && (
            <a
              href={lead.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Auf Google Maps ansehen
            </a>
          )}

          {/* Notizen */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Notizen</span>
            <Textarea
              value={notes || currentNotes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notizen zum Lead..."
              rows={3}
              onFocus={() => { if (!notes) setNotes(currentNotes); }}
            />
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={updateNotes.isPending}
            >
              Notizen speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
