import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";

// Helper functions to convert between DB format (MM-DD) and German format (TT.MM)
const dbToGerman = (dbDate: string | null | undefined): string => {
    if (!dbDate) return "";
    // MM-DD -> TT.MM
    const parts = dbDate.split("-");
    if (parts.length !== 2) return dbDate;
    return `${parts[1]}.${parts[0]}`;
};

const germanToDb = (germanDate: string): string => {
    // TT.MM -> MM-DD
    const parts = germanDate.split(".");
    if (parts.length !== 2) return germanDate;
    return `${parts[1]}-${parts[0]}`;
};

interface PurchaseIntervalSettingsProps {
    kundenNummer: number;
    currentInterval: number | string | null;
    seasonStart?: string | null;
    seasonEnd?: string | null;
    onUpdate: (updates: {
        purchase_interval?: number;
        season_start?: string | null;
        season_end?: string | null;
    }) => void;
    trigger?: React.ReactNode;
}

export function PurchaseIntervalSettings({
    kundenNummer,
    currentInterval,
    seasonStart,
    seasonEnd,
    onUpdate,
    trigger
}: PurchaseIntervalSettingsProps) {
    // Determine initial interval type based on season fields and current value
    const getInitialInterval = () => {
        if (seasonStart && seasonEnd) return 'Saisonal';
        if (currentInterval && ![7, 14, 21, 28].includes(Number(currentInterval))) return 'Manual';
        return currentInterval?.toString() || "7";
    };

    const [open, setOpen] = useState(false);
    const [selectedInterval, setSelectedInterval] = useState<string>(getInitialInterval);

    // State for extended fields - initialize from props or defaults
    const [customDays, setCustomDays] = useState<string>(
        (currentInterval && ![7, 14, 21, 28].includes(Number(currentInterval)))
            ? currentInterval.toString()
            : "10"
    );
    // Store dates in German format (TT.MM) for display
    const [seasonStartDate, setSeasonStartDate] = useState<string>(dbToGerman(seasonStart) || "01.04");
    const [seasonEndDate, setSeasonEndDate] = useState<string>(dbToGerman(seasonEnd) || "30.09");
    const [seasonalDays, setSeasonalDays] = useState<string>(
        (seasonStart && seasonEnd && currentInterval)
            ? currentInterval.toString()
            : "7"
    );

    const handleIntervalChange = (value: string) => {
        setSelectedInterval(value);

        // Clear related fields when changing interval type
        if (value !== 'Saisonal') {
            setSeasonStartDate('');
            setSeasonEndDate('');
            setSeasonalDays('');
        }
        if (value !== 'Manual') {
            setCustomDays('');
        }
    };

    const handleSave = () => {
        // Build update object - only use fields that exist in DB!
        const updates: any = {};

        // Clear seasonal fields first
        updates.season_start = null;
        updates.season_end = null;

        if (selectedInterval === 'Manual') {
            const days = parseInt(customDays);
            if (isNaN(days) || days < 1) {
                toast.error("Bitte geben Sie eine gültige Anzahl an Tagen ein.");
                return;
            }
            // Store custom days in purchase_interval
            updates.purchase_interval = days;
        } else if (selectedInterval === 'Saisonal') {
            const days = parseInt(seasonalDays);
            if (isNaN(days) || days < 1) {
                toast.error("Bitte geben Sie ein gültiges Saison-Intervall ein.");
                return;
            }
            // Validate date format TT.MM (German)
            const dateRegex = /^(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])$/;
            if (!dateRegex.test(seasonStartDate) || !dateRegex.test(seasonEndDate)) {
                toast.error("Bitte verwenden Sie das Datumsformat TT.MM (z.B. 01.04).");
                return;
            }

            // Convert German format to DB format (MM-DD) for storage
            updates.season_start = germanToDb(seasonStartDate);
            updates.season_end = germanToDb(seasonEndDate);
            updates.purchase_interval = days; // Store interval days in purchase_interval
        } else {
            // Standard intervals: 7, 14, 21, 28
            const intervalValue = parseInt(selectedInterval);
            updates.purchase_interval = intervalValue;
        }

        onUpdate(updates);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Settings2 className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Kaufintervall Einstellungen</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="interval-type" className="text-right">
                            Typ
                        </Label>
                        <Select value={selectedInterval} onValueChange={handleIntervalChange}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">7 Tage</SelectItem>
                                <SelectItem value="14">14 Tage</SelectItem>
                                <SelectItem value="21">21 Tage</SelectItem>
                                <SelectItem value="Manual">Manuell</SelectItem>
                                <SelectItem value="Saisonal">Saisonal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedInterval === "Manual" && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="manual-days" className="text-right">
                                Tage
                            </Label>
                            <Input
                                id="manual-days"
                                type="number"
                                value={customDays}
                                onChange={(e) => setCustomDays(e.target.value)}
                                className="col-span-3"
                                min="1"
                            />
                        </div>
                    )}

                    {selectedInterval === "Saisonal" && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="season-start" className="text-right">
                                    Start (TT.MM)
                                </Label>
                                <Input
                                    id="season-start"
                                    value={seasonStartDate}
                                    onChange={(e) => setSeasonStartDate(e.target.value)}
                                    className="col-span-3"
                                    placeholder="01.04"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="season-end" className="text-right">
                                    Ende (TT.MM)
                                </Label>
                                <Input
                                    id="season-end"
                                    value={seasonEndDate}
                                    onChange={(e) => setSeasonEndDate(e.target.value)}
                                    className="col-span-3"
                                    placeholder="30.09"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="season-interval" className="text-right">
                                    Intervall (Tage)
                                </Label>
                                <Input
                                    id="season-interval"
                                    type="number"
                                    value={seasonalDays}
                                    onChange={(e) => setSeasonalDays(e.target.value)}
                                    className="col-span-3"
                                    min="1"
                                />
                            </div>
                        </>
                    )}
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave}>Speichern</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
