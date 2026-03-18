import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { MapPin } from "lucide-react";
import { useReps } from "@/features/reps/hooks/useReps";
import { useCreateLeadRoute } from "../hooks/useLeadRoutes";
import { Lead } from "../hooks/useLeads";
import { toast } from "sonner";

interface CreateLeadRouteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeads: Lead[];
  defaultPlz?: string;
  onSuccess?: () => void;
}

export function CreateLeadRouteDialog({
  isOpen,
  onClose,
  selectedLeads,
  defaultPlz,
  onSuccess,
}: CreateLeadRouteDialogProps) {
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const defaultName = defaultPlz
    ? `Lead-Runde PLZ ${defaultPlz} — ${today}`
    : `Lead-Runde — ${today}`;

  const [routeName, setRouteName] = useState(defaultName);
  const [selectedRepId, setSelectedRepId] = useState<string>("");

  const { data: reps } = useReps();
  const createLeadRoute = useCreateLeadRoute();

  const handleCreate = async () => {
    if (!selectedRepId || !routeName.trim()) return;

    try {
      await createLeadRoute.mutateAsync({
        repId: parseInt(selectedRepId),
        name: routeName.trim(),
        leads: selectedLeads,
      });
      toast.success(`Lead-Runde mit ${selectedLeads.length} Leads erstellt`);
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Fehler beim Erstellen der Lead-Runde");
    }
  };

  // Reset name wenn Dialog geöffnet wird
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setRouteName(defaultName);
      setSelectedRepId("");
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Lead-Runde erstellen
          </DialogTitle>
          <DialogDescription>
            Erstelle eine Route aus den ausgewählten Leads und weise sie einem Außendienst-Mitarbeiter zu.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Routenname</Label>
            <Input
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="z.B. Lead-Runde PLZ 20095"
            />
          </div>

          <div className="grid gap-2">
            <Label>Zuweisen an</Label>
            <Select value={selectedRepId} onValueChange={setSelectedRepId}>
              <SelectTrigger>
                <SelectValue placeholder="Außendienst auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {reps?.map((rep) => (
                  <SelectItem key={rep.rep_id} value={String(rep.rep_id)}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <span className="font-medium">{selectedLeads.length} Leads</span> ausgewählt.
            Die Stops werden automatisch nach geografischer Nähe sortiert (Nearest-Neighbor).
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedRepId || !routeName.trim() || createLeadRoute.isPending}
          >
            {createLeadRoute.isPending ? "Erstelle..." : "Lead-Runde erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
