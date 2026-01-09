import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Label } from "@/shared/components/ui/label";

interface RejectionReasonDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string, note?: string) => void;
    customerName: string;
    rejectionReasons: string[];
}

export function RejectionReasonDialog({
    isOpen,
    onClose,
    onSubmit,
    customerName,
    rejectionReasons,
}: RejectionReasonDialogProps) {
    const [selectedReason, setSelectedReason] = useState("");
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        // Check if note is required when "Sonstiges" is selected
        if (selectedReason === "Sonstiges" && !note.trim()) {
            return; // Validation will handle this
        }

        setIsSubmitting(true);
        onSubmit(selectedReason, note || undefined);
        setSelectedReason("");
        setNote("");
        setIsSubmitting(false);
    };

    const handleClose = () => {
        setSelectedReason("");
        setNote("");
        onClose();
    };

    // Add "Sonstiges" to the list if not already there
    const reasonsWithOther = rejectionReasons.includes("Sonstiges")
        ? rejectionReasons
        : [...rejectionReasons, "Sonstiges"];

    const isNoteRequired = selectedReason === "Sonstiges";
    const isValid = selectedReason && (!isNoteRequired || note.trim());

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Absagegrund für {customerName}</DialogTitle>
                    <DialogDescription>
                        Bitte wählen Sie den Grund für die Ablehnung aus.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                        {reasonsWithOther.map((reason) => (
                            <div key={reason} className="flex items-center space-x-2">
                                <RadioGroupItem value={reason} id={`reason-${reason}`} />
                                <Label htmlFor={`reason-${reason}`} className="cursor-pointer">
                                    {reason}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>

                    <div className="space-y-2">
                        <Label htmlFor="note">
                            Notiz {isNoteRequired && <span className="text-destructive">*</span>}
                        </Label>
                        <Textarea
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={isNoteRequired ? "Bitte geben Sie eine Notiz ein..." : "Optionale Notiz"}
                            rows={3}
                        />
                        {isNoteRequired && !note.trim() && (
                            <p className="text-sm text-destructive">
                                Notiz ist erforderlich wenn "Sonstiges" ausgewählt ist
                            </p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>
                        Abbrechen
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                    >
                        Bestätigen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
