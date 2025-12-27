import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface OpeningHoursPickerProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    onCopyToAll?: () => void;
    showCopyButton?: boolean;
}

// Generate time options in 30min intervals from 06:00 to 02:00
const generateTimeOptions = () => {
    const times: string[] = [];
    for (let hour = 6; hour <= 24; hour++) {
        const displayHour = hour === 24 ? 0 : hour;
        times.push(`${displayHour.toString().padStart(2, '0')}:00`);
        times.push(`${displayHour.toString().padStart(2, '0')}:30`);
    }
    // Add late night hours
    times.push('01:00', '01:30', '02:00');
    return times;
};

const TIME_OPTIONS = generateTimeOptions();

export function OpeningHoursPicker({ value, onChange, label, onCopyToAll, showCopyButton = false }: OpeningHoursPickerProps) {
    // Parse value: "10:00-22:00" or "Ruhetag" or ""
    const isRuhetag = value === "Ruhetag";
    const isClosed = !value || isRuhetag;

    let openTime = "";
    let closeTime = "";

    if (value && !isRuhetag && value.includes("-")) {
        const [open, close] = value.split("-");
        openTime = open?.trim() || "";
        closeTime = close?.trim() || "";
    }

    const handleOpenChange = (checked: boolean) => {
        if (checked) {
            // Default opening hours when switching from Ruhetag
            onChange("10:00-22:00");
        } else {
            onChange("Ruhetag");
        }
    };

    const handleTimeChange = (type: 'open' | 'close', newTime: string) => {
        if (type === 'open') {
            onChange(`${newTime}-${closeTime || '22:00'}`);
        } else {
            onChange(`${openTime || '10:00'}-${newTime}`);
        }
    };

    return (
        <div className="flex items-center gap-2 py-1">
            <Label className="w-8 text-sm font-medium shrink-0">{label}</Label>

            <div className="flex items-center gap-1">
                <Switch
                    checked={!isClosed}
                    onCheckedChange={handleOpenChange}
                    className="data-[state=checked]:bg-green-500"
                />
                <span className={cn(
                    "text-xs w-14",
                    isClosed ? "text-muted-foreground" : "text-green-600 font-medium"
                )}>
                    {isClosed ? "Ruhetag" : "Geöffnet"}
                </span>
            </div>

            {!isClosed && (
                <div className="flex items-center gap-1 flex-1">
                    <Select value={openTime} onValueChange={(v) => handleTimeChange('open', v)}>
                        <SelectTrigger className="w-20 h-8 text-sm">
                            <SelectValue placeholder="Von" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {TIME_OPTIONS.map((time) => (
                                <SelectItem key={`open-${time}`} value={time}>
                                    {time}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <span className="text-muted-foreground text-sm">-</span>

                    <Select value={closeTime} onValueChange={(v) => handleTimeChange('close', v)}>
                        <SelectTrigger className="w-20 h-8 text-sm">
                            <SelectValue placeholder="Bis" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {TIME_OPTIONS.map((time) => (
                                <SelectItem key={`close-${time}`} value={time}>
                                    {time}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {showCopyButton && onCopyToAll && (
                        <button
                            type="button"
                            onClick={onCopyToAll}
                            className="text-xs text-primary hover:underline ml-2 whitespace-nowrap"
                        >
                            → Alle Tage
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
