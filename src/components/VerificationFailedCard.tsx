import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Calendar, Check, X, AlertTriangle, FileText } from "lucide-react";
import { useState } from "react";
import { RejectionReasonDialog } from "@/components/RejectionReasonDialog";
import { OfferDialog } from "@/components/OfferDialog";
import { VerificationFailedTask } from "@/hooks/useVerificationFailedTasks";

interface VerificationFailedCardProps {
  task: VerificationFailedTask;
  onComplete: (taskId: string, action: string, failureReason?: string, note?: string, reminderDate?: string) => void;
}

export function VerificationFailedCard({ task, onComplete }: VerificationFailedCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);

  const handleAction = (action: string, failureReason?: string, note?: string, reminderDate?: string) => {
    setIsRemoving(true);
    setTimeout(() => {
      onComplete(task.task_id, action, failureReason, note, reminderDate);
    }, 300);
  };

  const handleRejectionReasonSubmit = (reason: string, note?: string) => {
    handleAction("DECLINED", reason, note);
  };

  const handleOfferSubmit = (action: string, reminderDate?: string, reason?: string, note?: string) => {
    if (action === "OFFER" && reminderDate) {
      handleAction("OFFER", undefined, undefined, reminderDate);
    } else if (action === "CLAIMED") {
      handleAction("CLAIMED");
    } else if (action === "DECLINED") {
      handleAction("DECLINED", reason, note);
    }
  };

  const claimedDate = task.claimed_at ? new Date(task.claimed_at).toLocaleDateString("de-DE") : "Unbekannt";

  return (
    <>
      <RejectionReasonDialog
        isOpen={showRejectionDialog}
        onClose={() => setShowRejectionDialog(false)}
        onSubmit={handleRejectionReasonSubmit}
        customerName={task.firma}
        rejectionReasons={["Preis zu hoch", "Kein Bedarf", "Sonstiges"]}
      />

      <OfferDialog
        isOpen={showOfferDialog}
        onClose={() => setShowOfferDialog(false)}
        onSubmit={handleOfferSubmit}
        customerName={task.firma}
      />

      <Card
        className={`
          transition-all duration-300 hover:shadow-md border-2 border-red-400 bg-red-50
          ${isRemoving ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100 scale-100'}
        `}
      >
        <CardContent className="p-4 sm:p-6">
          {/* Header with Warning Badge */}
          <div className="mb-4">
            <Badge variant="destructive" className="mb-2 bg-red-600 text-white">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Kauf nicht verifiziert
            </Badge>
            <h3 className="text-lg font-bold text-foreground">
              {task.firma}
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Kunde hat bei Kampagne <strong>{task.campaign_name}</strong> nicht gekauft
            </p>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm text-muted-foreground">
            {task.ort && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{task.ort}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-red-700">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Vom Außendienst gemeldet am {claimedDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Außendienst: {task.rep_name}</span>
            </div>

            {task.kunden_nummer && (
              <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
                Kunden-Nr: {task.kunden_nummer}
              </div>
            )}
          </div>

          {/* Action Buttons - Same as normal Campaign Tasks */}
          <div className="flex flex-col gap-2 mt-4">
            <Button
              onClick={() => handleAction("CLAIMED")}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm whitespace-normal h-auto py-2"
              size="sm"
            >
              <Check className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Kunde hat doch gekauft</span>
            </Button>
            <Button
              onClick={() => setShowOfferDialog(true)}
              variant="secondary"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm whitespace-normal h-auto py-2"
              size="sm"
            >
              <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Angebot abgeben</span>
            </Button>
            <Button
              onClick={() => setShowRejectionDialog(true)}
              variant="outline"
              className="w-full border-red-500 text-red-600 hover:bg-red-50 text-sm whitespace-normal h-auto py-2"
              size="sm"
            >
              <X className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Abgelehnt</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
