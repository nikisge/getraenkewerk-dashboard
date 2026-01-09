import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DashboardTask } from "@/features/dashboard/hooks/useDashboardTasks";
import { Building2, Calendar, Clock, Tag, Check, X } from "lucide-react";
import { useState } from "react";
import { RejectionReasonDialog } from "@/features/campaigns/components/RejectionReasonDialog";

interface OfferCardProps {
    task: DashboardTask;
    onStatusChange?: (taskId: string, action: string, failureReason?: string, note?: string) => void;
}

export function OfferCard({ task, onStatusChange }: OfferCardProps) {
    const [showRejectionDialog, setShowRejectionDialog] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const reminderDate = new Date(task.reminder_date!);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isDue = reminderDate <= today;

    const handleClaimed = () => {
        if (!onStatusChange) return;
        setIsUpdating(true);
        onStatusChange(task.task_id || "", "CLAIMED");
    };

    const handleRejection = () => {
        setShowRejectionDialog(true);
    };

    const handleRejectionSubmit = (reason: string, note?: string) => {
        if (!onStatusChange) return;
        setIsUpdating(true);
        onStatusChange(task.task_id || "", "DECLINED", reason, note);
    };

    return (
        <>
            <RejectionReasonDialog
                isOpen={showRejectionDialog}
                onClose={() => setShowRejectionDialog(false)}
                onSubmit={handleRejectionSubmit}
                customerName={task.firma || "Kunde"}
                rejectionReasons={(task.campaign_rejection_reasons as string[]) || ["Preis zu hoch", "Kein Bedarf", "Sonstiges"]}
            />

            <Card className={`mb-4 ${isDue ? 'border-red-200 bg-red-50/50' : ''} ${isUpdating ? 'opacity-50' : ''}`}>
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                {task.firma}
                            </CardTitle>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {task.title}
                            </div>
                        </div>
                        {isDue ? (
                            <Badge variant="destructive">Fällig!</Badge>
                        ) : (
                            <Badge variant="secondary">Ausstehend</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Angebot am:
                        </span>
                        <span>{task.last_change ? new Date(task.last_change).toLocaleDateString('de-DE') : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Erinnerung am:
                        </span>
                        <span className={`font-medium ${isDue ? 'text-red-600' : ''}`}>
                            {reminderDate.toLocaleDateString('de-DE')}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    {onStatusChange && (
                        <div className="flex flex-col gap-2 pt-2">
                            <Button
                                onClick={handleClaimed}
                                disabled={isUpdating}
                                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
                                size="sm"
                            >
                                <Check className="mr-2 h-4 w-4" />
                                Kunde hat gekauft
                            </Button>
                            <Button
                                onClick={handleRejection}
                                disabled={isUpdating}
                                variant="outline"
                                className="w-full border-red-500 text-red-600 hover:bg-red-50 text-sm"
                                size="sm"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Abgelehnt
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
