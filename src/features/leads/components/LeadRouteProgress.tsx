import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Progress } from "@/shared/components/ui/progress";
import { MapPin, CheckCircle2, Circle, Clock, User, Trash2, Pencil } from "lucide-react";
import { useLeadRouteProgress, useDeleteLeadRoute, useUpdateLeadRoute } from "../hooks/useLeadRoutes";
import { useReps } from "@/features/reps/hooks/useReps";
import { useAuth } from "@/features/auth/context/AuthContext";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { toast } from "sonner";

interface LeadRouteProgressProps {
  routeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LeadRouteProgress({ routeId, isOpen, onClose }: LeadRouteProgressProps) {
  const { data: route, isLoading } = useLeadRouteProgress(routeId || undefined);
  const { rep } = useAuth();
  const isAdmin = rep?.is_admin;
  const deleteRoute = useDeleteLeadRoute();
  const updateRoute = useUpdateLeadRoute();
  const { data: reps } = useReps();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRepId, setEditRepId] = useState("");

  const handleStartEdit = () => {
    if (!route) return;
    setEditName(route.name);
    setEditRepId(String(route.rep_id));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!routeId || !editName.trim() || !editRepId) return;
    try {
      await updateRoute.mutateAsync({
        routeId,
        name: editName.trim(),
        repId: parseInt(editRepId),
      });
      toast.success("Lead-Runde aktualisiert");
      setIsEditing(false);
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleDelete = async () => {
    if (!routeId) return;
    if (!confirm("Lead-Runde wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    try {
      await deleteRoute.mutateAsync(routeId);
      toast.success("Lead-Runde gelöscht");
      onClose();
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  if (!routeId) return null;

  const totalStops = route?.stops?.length || 0;
  const visitedStops = route?.stops?.filter(s => s.visited_at)?.length || 0;
  const progressPercent = totalStops > 0 ? Math.round((visitedStops / totalStops) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {route?.name || "Lead-Runde"}
            </DialogTitle>
            {isAdmin && route && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleStartEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deleteRoute.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Laden...</div>
        ) : route ? (
          <div className="space-y-4 overflow-y-auto">
            {/* Bearbeiten-Modus */}
            {isEditing && (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div className="grid gap-2">
                  <Label>Routenname</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Zugewiesen an</Label>
                  <Select value={editRepId} onValueChange={setEditRepId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {reps?.map((r) => (
                        <SelectItem key={r.rep_id} value={String(r.rep_id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Abbrechen</Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={updateRoute.isPending}>
                    {updateRoute.isPending ? "Speichern..." : "Speichern"}
                  </Button>
                </div>
              </div>
            )}

            {/* Zusammenfassung */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fortschritt</span>
                <span className="font-medium">{visitedStops} / {totalStops} besucht</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="flex gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {route.rep_name}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(route.created_at).toLocaleDateString("de-DE")}
              </div>
            </div>

            {/* Stop-Liste */}
            <div className="space-y-2">
              {route.stops?.map((stop, index) => (
                <div
                  key={stop.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    stop.visited_at ? "bg-green-50/50 border-green-200" : ""
                  }`}
                >
                  <div className="mt-0.5">
                    {stop.visited_at ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{index + 1}.</span>
                      <span className="font-medium text-sm truncate">{stop.lead?.name || "Unbekannt"}</span>
                      {stop.lead && <LeadStatusBadge status={stop.lead.status} />}
                    </div>
                    {stop.lead?.address && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{stop.lead.address}</p>
                    )}
                    {stop.visited_at && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Besucht am {new Date(stop.visited_at).toLocaleString("de-DE")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
