import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, X } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { RejectionReasonDialog } from "@/components/RejectionReasonDialog";

interface OfferDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (action: string, reminderDate?: string, reason?: string, note?: string) => void;
    customerName: string;
    initialDate?: Date;
    rejectionReasons?: string[];
}

export function OfferDialog({ isOpen, onClose, onSubmit, customerName, initialDate, rejectionReasons }: OfferDialogProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
    const [showRejectionDialog, setShowRejectionDialog] = useState(false);

    // Update selectedDate when initialDate changes
    useEffect(() => {
        if (initialDate) {
            setSelectedDate(initialDate);
        }
    }, [initialDate]);

    const handleDateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate) return;

        // Format date as YYYY-MM-DD for database
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        onSubmit("OFFER", formattedDate);
        onClose();
    };

    const handleClaimed = () => {
        onSubmit("CLAIMED");
        onClose();
    };

    const handleDeclined = (reason: string, note?: string) => {
        onSubmit("DECLINED", undefined, reason, note);
        setShowRejectionDialog(false);
        onClose();
    };

    const handleClose = () => {
        setSelectedDate(undefined);
        onClose();
    };

    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return (
        <>
            <RejectionReasonDialog
                isOpen={showRejectionDialog}
                onClose={() => setShowRejectionDialog(false)}
                onSubmit={handleDeclined}
                customerName={customerName}
                rejectionReasons={rejectionReasons || ["Preis zu hoch", "Kein Bedarf", "Sonstiges"]}
            />

            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Angebot für {customerName} bearbeiten</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Option 1: Update Reminder */}
                        <form onSubmit={handleDateSubmit} className="space-y-4 border-b pb-6">
                            <div className="space-y-2">
                                <Label>Erinnerungsdatum ändern</Label>
                                <div className="flex gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !selectedDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {selectedDate ? format(selectedDate, "PPP", { locale: de }) : "Datum auswählen"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={setSelectedDate}
                                                disabled={(date) => date < tomorrow}
                                                initialFocus
                                                locale={de}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Button type="submit" disabled={!selectedDate}>
                                        Speichern
                                    </Button>
                                </div>
                            </div>
                        </form>

                        {/* Option 2: Complete Task */}
                        <div className="space-y-2">
                            <Label>Status ändern</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    onClick={handleClaimed}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Check className="mr-2 h-4 w-4" />
                                    Gekauft
                                </Button>
                                <Button
                                    onClick={() => setShowRejectionDialog(true)}
                                    variant="outline"
                                    className="border-red-500 text-red-600 hover:bg-red-50"
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Abgelehnt
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={handleClose}>
                            Schließen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
