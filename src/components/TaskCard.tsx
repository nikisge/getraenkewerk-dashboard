import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardTask } from "@/hooks/useDashboardTasks";
import { Building2, MapPin, Calendar, Check, FileText, X, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { ChurnReasonDialog } from "@/components/ChurnReasonDialog";
import { RejectionReasonDialog } from "@/components/RejectionReasonDialog";
import { useAuth } from "@/contexts/AuthContext";
import { PurchaseIntervalSettings } from "@/components/PurchaseIntervalSettings";
import { useUpdateCustomer } from "@/hooks/useCustomers";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { OfferDialog } from "@/components/OfferDialog";

interface TaskCardProps {
  task: DashboardTask;
  onComplete: (taskId: string, taskType: string, action: string, failureReason?: string, note?: string, reminderDate?: string) => void;
  onTransfer?: () => void;
  showMobileTransfer?: boolean;
}

export function TaskCard({ task, onComplete, onTransfer, showMobileTransfer }: TaskCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [showChurnDialog, setShowChurnDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const { rep } = useAuth();
  const updateCustomer = useUpdateCustomer();

  const handleAction = (action: string, failureReason?: string, note?: string, reminderDate?: string) => {
    setIsRemoving(true);
    // Wait for animation before calling onComplete
    setTimeout(() => {
      // Pass all data to parent via task metadata or additional callback
      onComplete(task.task_id || "", task.task_type || "", action, failureReason, note, reminderDate);
    }, 300);
  };

  const handleChurnLost = () => {
    setShowChurnDialog(true);
  };

  const handleChurnReasonSubmit = (reason: string) => {
    handleAction("LOST", reason);
  };

  const handleRejection = () => {
    setShowRejectionDialog(true);
  };

  const handleRejectionReasonSubmit = (reason: string, note?: string) => {
    // Store reason in failure_reason and note in notitz_rep
    handleAction("DECLINED", reason, note);
  };

  const handleOfferSubmit = (reminderDate: string) => {
    // Set status to OFFER and set reminder_date
    handleAction("OFFER", undefined, undefined, reminderDate);
  };

  const renderPromoActions = () => (
    <div className="flex flex-col gap-2 mt-4">
      <Button
        onClick={() => handleAction("CLAIMED")}
        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm whitespace-normal h-auto py-2"
        size="sm"
      >
        <Check className="mr-2 h-4 w-4 flex-shrink-0" />
        <span>Kunde sagt er hat gekauft</span>
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
        onClick={handleRejection}
        variant="outline"
        className="w-full border-red-500 text-red-600 hover:bg-red-50 text-sm whitespace-normal h-auto py-2"
        size="sm"
      >
        <X className="mr-2 h-4 w-4 flex-shrink-0" />
        <span>Abgelehnt</span>
      </Button>
    </div>
  );

  const renderChurnActions = () => (
    <div className="flex flex-col gap-2 mt-4">
      <Button
        onClick={() => handleAction("RETAINED")}
        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm whitespace-normal h-auto py-2"
        size="sm"
      >
        <Check className="mr-2 h-4 w-4 flex-shrink-0" />
        <span>Kunde kauft wieder</span>
      </Button>
      <Button
        onClick={handleChurnLost}
        variant="outline"
        className="w-full border-red-500 text-red-600 hover:bg-red-50 text-sm whitespace-normal h-auto py-2"
        size="sm"
      >
        <X className="mr-2 h-4 w-4 flex-shrink-0" />
        <span>Kauft nicht mehr</span>
      </Button>

      <PurchaseIntervalSettings
        kundenNummer={task.kunden_nummer || 0}
        currentInterval={task.purchase_interval as any} // Type assertion needed until full propagation
        seasonStart={task.season_start}
        seasonEnd={task.season_end}
        seasonalInterval={task.seasonal_interval}
        customInterval={task.custom_interval}
        onUpdate={(updates) => {
          updateCustomer.mutate({
            kunden_nummer: task.kunden_nummer || 0,
            updates: updates,
          }, {
            onSuccess: () => toast.success("Kaufintervall aktualisiert"),
            onError: () => toast.error("Fehler beim Aktualisieren"),
          });
        }}
        trigger={
          <Button
            variant="outline"
            className="w-full text-sm whitespace-normal h-auto py-2"
            size="sm"
          >
            <Settings2 className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>Kaufintervall ändern</span>
          </Button>
        }
      />
    </div>
  );

  return (
    <>
      <ChurnReasonDialog
        isOpen={showChurnDialog}
        onClose={() => setShowChurnDialog(false)}
        onSubmit={handleChurnReasonSubmit}
        customerName={task.firma || "Kunde"}
      />

      <RejectionReasonDialog
        isOpen={showRejectionDialog}
        onClose={() => setShowRejectionDialog(false)}
        onSubmit={handleRejectionReasonSubmit}
        customerName={task.firma || "Kunde"}
        rejectionReasons={(task.campaign_rejection_reasons as string[]) || ["Preis zu hoch", "Kein Bedarf", "Sonstiges"]}
      />

      <OfferDialog
        isOpen={showOfferDialog}
        onClose={() => setShowOfferDialog(false)}
        onSubmit={handleOfferSubmit}
        customerName={task.firma || "Kunde"}
      />

      <Card
        className={`
          transition-all duration-300 hover:shadow-md
          ${isRemoving ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100 scale-100'}
        `}
      >
        <CardContent className="p-4 sm:p-6">
          {/* Mobile Transfer Button - Only show for admin on mobile */}
          {showMobileTransfer && rep?.role === 'admin' && onTransfer && (
            <div className="mb-3 md:hidden">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={onTransfer}
              >
                <ArrowRightLeft className="mr-2 h-3 w-3" />
                An anderen Mitarbeiter übertragen
              </Button>
            </div>
          )}

          {/* Header */}
          <div className="mb-4">
            {task.task_type === 'churn' && (
              <Badge variant="destructive" className="mb-2 bg-red-500 text-white">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Kunde droht inaktiv zu werden
              </Badge>
            )}
            <h3 className="text-lg font-bold text-foreground">
              {task.task_type === 'promo' && `Neuer Artikel: ${task.title || 'Kampagne'}`}
              {task.task_type === 'churn' && (task.firma || 'Kunde')}
            </h3>
          </div>

          {/* Customer Details */}
          <div className="space-y-2 text-sm text-muted-foreground">
            {task.firma && task.task_type === 'promo' && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{task.firma}</span>
              </div>
            )}

            {task.ort && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{task.ort}</span>
              </div>
            )}

            {task.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>{new Date(task.due_date).toLocaleDateString("de-DE")}</span>
              </div>
            )}

            {task.kunden_nummer && (
              <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
                Kunden-Nr: {task.kunden_nummer}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {task.task_type === 'promo' && renderPromoActions()}
          {task.task_type === 'churn' && renderChurnActions()}
        </CardContent>
      </Card>
    </>
  );
}
